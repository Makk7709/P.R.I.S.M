/**
 * Chat Upload Routes - Routes API pour l'upload de fichiers dans le chat
 *
 * Expose les endpoints pour:
 * - Upload de fichiers avec analyse
 * - Questions de suivi sur fichiers
 * - Gestion du contexte de fichier
 *
 * @module backend/routes/chatUpload
 */

import express from 'express';
import {
  upload,
  validateExcelFile,
  handleMulterError,
  uploadRateLimiter,
} from '../middleware/fileUpload.js';
import { ChatFileProcessor } from '../../src/chat/ChatFileProcessor.js';
import { getElevenLabsService } from '../../src/voice/ElevenLabsService.js';
import { ResponseModeManager } from '../../src/voice/ResponseModeManager.js';

const router = express.Router();

// Instance du processeur de fichiers
const fileProcessor = new ChatFileProcessor({
  enableAI: true,
});

// ✨ NOUVEAU: Service ElevenLabs et gestion des modes
const elevenLabsService = getElevenLabsService();
const responseModeManager = new ResponseModeManager({
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
});

/**
 * POST /api/chat/upload
 *
 * Upload un fichier avec un message pour analyse
 *
 * Body (multipart/form-data):
 * - file: Fichier Excel/CSV
 * - message: Message utilisateur (optionnel, défaut: "Analyse ce fichier")
 * - sessionId: ID de session (requis)
 *
 * Response:
 * - success: boolean
 * - data: { response, analysis, fileContext, metadata, visualizations }
 */
router.post(
  '/upload',
  uploadRateLimiter,
  upload.single('file'),
  handleMulterError,
  validateExcelFile,
  async (req, res) => {
    try {
      const {
        message,
        sessionId,
        // ✨ NOUVEAU: Paramètres pour la logique écrit/vocal
        inputSource = 'keyboard',
        voiceConfidence = null,
      } = req.body;
      const file = req.file;

      // Validation du sessionId
      if (!sessionId || sessionId.trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SESSION',
            message: 'Session ID est requis',
          },
        });
      }

      const userMessage = message || 'Analyse ce fichier et donne-moi les statistiques principales';

      console.log(
        `[ChatUpload] Processing file with message: "${userMessage.substring(0, 50)}..."`
      );
      console.log(`[ChatUpload] Input source: ${inputSource}, confidence: ${voiceConfidence}`);

      // ✨ NOUVEAU: Détecter le mode d'entrée
      const inputMode = responseModeManager.detectInputMode({
        message: userMessage,
        source: inputSource,
        confidence: voiceConfidence ? Number.parseFloat(voiceConfidence) : null,
        hasAttachment: true,
      });

      const responseModeConfig = responseModeManager.determineResponseMode({
        inputMode,
        userPreferences: {},
        context: { hasFileAttachment: true },
      });

      console.log(
        `[ChatUpload] Input mode: ${inputMode}, Response mode: ${responseModeConfig.mode}`
      );

      // Traiter le fichier
      const result = await fileProcessor.processMessageWithFile(userMessage, file, sessionId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          userMessage: result.userMessage,
        });
      }

      // ✨ NOUVEAU: Générer l'audio si mode vocal
      let audioUrl = null;
      let shouldPlayAudio = false;

      if (responseModeConfig.generateAudio && elevenLabsService.isConfigured()) {
        console.log('[ChatUpload] 🔊 Generating audio for voice input...');

        try {
          // Pour les fichiers, générer un résumé vocal court
          audioUrl = await elevenLabsService.generateAnalysisSummary(result.analysis, userMessage);
          shouldPlayAudio = !!audioUrl;
          console.log('[ChatUpload] ✅ Audio generated:', shouldPlayAudio);
        } catch (audioError) {
          console.error('[ChatUpload] Audio generation error:', audioError.message);
        }
      } else {
        console.log('[ChatUpload] 📝 Text mode - skipping audio generation');
      }

      res.json({
        success: true,
        data: {
          response: result.response,
          aiInsights: result.aiInsights,
          fileContext: result.fileContext,
          metadata: result.metadata,
          visualizations: result.visualizations,
          analysisType: result.queryType,
          // ✨ NOUVEAU: Informations audio/mode
          inputMode: inputMode,
          responseMode: responseModeConfig.mode,
          audioUrl: audioUrl,
          shouldPlayAudio: shouldPlayAudio,
          fallbackToTTS: responseModeConfig.generateAudio && !audioUrl,
        },
      });
    } catch (error) {
      console.error('[ChatUpload] Error:', error);

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Une erreur interne est survenue',
        },
      });
    }
  }
);

/**
 * POST /api/chat/message
 *
 * Envoie un message avec vérification du contexte fichier
 *
 * Body:
 * - message: Message utilisateur (requis)
 * - sessionId: ID de session (requis)
 *
 * Response:
 * - success: boolean
 * - data: { response, hasFileContext }
 */
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Validation
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_MESSAGE',
          message: 'Message est requis',
        },
      });
    }

    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION',
          message: 'Session ID est requis',
        },
      });
    }

    // Vérifier si un fichier est en contexte
    const fileResponse = await fileProcessor.processFollowUpQuestion(message, sessionId);

    if (fileResponse) {
      return res.json({
        success: true,
        data: {
          ...fileResponse,
          hasFileContext: true,
        },
      });
    }

    // Pas de fichier en contexte - retourner indication
    res.json({
      success: true,
      data: {
        hasFileContext: false,
        message: "Aucun fichier en contexte. Uploadez un fichier pour commencer l'analyse.",
      },
    });
  } catch (error) {
    console.error('[ChatMessage] Error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Une erreur interne est survenue',
      },
    });
  }
});

/**
 * GET /api/chat/context/:sessionId
 *
 * Récupère le contexte fichier d'une session
 *
 * Response:
 * - success: boolean
 * - data: { hasContext, fileName, columns, statistics }
 */
router.get('/context/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const context = await fileProcessor.fileContextManager.get(sessionId);

    if (!context) {
      return res.json({
        success: true,
        data: {
          hasContext: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        hasContext: true,
        fileName: context.metadata.originalName,
        fileType: context.metadata.type,
        columns: context.columns,
        uploadedAt: context.metadata.uploadedAt,
      },
    });
  } catch (error) {
    console.error('[ChatContext] Error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Une erreur interne est survenue',
      },
    });
  }
});

/**
 * DELETE /api/chat/context/:sessionId
 *
 * Supprime le contexte fichier d'une session
 */
router.delete('/context/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await fileProcessor.fileContextManager.delete(sessionId);

    res.json({
      success: true,
      message: 'Contexte supprimé',
    });
  } catch (error) {
    console.error('[ChatContextDelete] Error:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Une erreur interne est survenue',
      },
    });
  }
});

/**
 * GET /api/chat/stats
 *
 * Statistiques d'utilisation du service
 */
router.get('/stats', (req, res) => {
  try {
    const stats = fileProcessor.fileContextManager.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Une erreur interne est survenue',
      },
    });
  }
});

export default router;
