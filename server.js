// Sécurité : charger les variables d'environnement AVANT tout autre import
import 'dotenv/config';

// Ensuite seulement, charger la config et les autres modules
import * as config from './config.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';
import { VoicePersonalityEnhancer } from './backend/voicePersonalityEnhancer.js';
import { handleUserInstruction } from './backend/orchestrator.js';
import { HybridOrchestrator } from './src/orchestrator/HybridOrchestrator.js';
import { TaskTypeProcessor } from './src/core/TaskTypeProcessor.js';
import { ImageGenerator } from './src/infographic/ImageGenerator.js';
import { ResponseModeManager } from './src/voice/ResponseModeManager.js';
import { getTrustContext, CriticalityLevel } from './src/core/TrustContext.js';
import { createElevenLabsAudioGenerator } from './backend/voice/elevenLabsAudio.js';
import { createVoiceChatController } from './backend/controllers/voiceChatController.js';

// Initialiser l'orchestrateur hybride (routing + consensus)
const hybridOrchestrator = new HybridOrchestrator();

// ✨ NOUVEAU: Initialiser le TaskTypeProcessor (orchestration AGI complète avec mémoire)
const taskTypeProcessor = new TaskTypeProcessor();
console.log(
  '[INIT] ✅ TaskTypeProcessor initialisé - Mémoire persistante et orchestration AGI activées'
);

// ✨ NOUVEAU: Initialiser le ImageGenerator (Nano Banana Pro + Gemini 2.0 Flash)
const imageGenerator = new ImageGenerator();
console.log("[INIT] ✅ ImageGenerator initialisé - Nano Banana Pro prêt pour génération d'images");

// ✨ NOUVEAU: Initialiser le ResponseModeManager (logique écrit/vocal intelligente)
const responseModeManager = new ResponseModeManager({
  elevenLabsApiKey: config.config.CONFIG.ELEVENLABS?.API_KEY,
  defaultVoiceId: config.config.CONFIG.ELEVENLABS?.VOICE_ID || 'm5SBIR8kR76fbA5dP2rU',
  voiceConfidenceThreshold: 0.6,
  maxAudioLength: 4000,
});
console.log('[INIT] ✅ ResponseModeManager initialisé - Logique écrit/vocal intelligente active');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// Chargement dynamique pour éviter erreur si le module CommonJS/ESM mixte ne fournit pas l'export attendu
let enterpriseExportRouter = null;
try {
  const routeModule = await import('./backend/routes/enterpriseExport.js');
  enterpriseExportRouter = routeModule.enterpriseExportRouter ?? routeModule.default ?? null;
} catch (err) {
  console.warn('[INIT] Enterprise export route disabled:', err.message);
}

// ✨ NOUVEAU: Charger le module d'upload Excel pour le chat
let chatUploadRouter = null;
try {
  const chatUploadModule = await import('./backend/routes/chatUpload.js');
  chatUploadRouter = chatUploadModule.default ?? chatUploadModule.chatUploadRouter ?? null;
  console.log('[INIT] ✅ Module Excel/Chat Upload chargé');
} catch (err) {
  console.warn('[INIT] Chat upload route disabled:', err.message);
}

// Initialiser l'enhancer vocal
const voiceEnhancer = new VoicePersonalityEnhancer();

// DEBUG PIPELINE LOGGING (temporaire)
const DEBUG_LOG_PIPELINE = true;
function pipelineLog(...args) {
  if (DEBUG_LOG_PIPELINE) {
    const ts = Date.now();
    console.log(`[PIPELINE][${ts}]`, ...args);
  }
}

// Générateur audio ElevenLabs (extrait dans un module testable pour réduire la
// complexité cognitive — S3776 — et éviter un appel réseau dans les tests).
const generateElevenLabsAudio = createElevenLabsAudioGenerator({ config });

// Contrôleur de la route /api/chat (extrait dans un module testable — S3776).
// server.js se contente de câbler les dépendances ; le comportement observable
// (status, payloads, headers, effets) est inchangé.
const voiceChatController = createVoiceChatController({
  taskTypeProcessor,
  hybridOrchestrator,
  handleUserInstruction,
  responseModeManager,
  voiceEnhancer,
  config,
  generateAudio: generateElevenLabsAudio,
  getTrustContext,
  CriticalityLevel,
  pipelineLog,
});

// API Route pour le chat PRISM avec ElevenLabs
app.post('/api/chat', voiceChatController.handleChat);

// API Route pour tester une voix ElevenLabs
app.get('/api/test-voice', async (req, res) => {
  const { voiceId, voiceName } = req.query;

  try {
    console.log(`[Voice Test] Testing voice: ${voiceName} (${voiceId})`);

    if (
      !config.config.CONFIG.ELEVENLABS.API_KEY ||
      config.config.CONFIG.ELEVENLABS.API_KEY === 'ta_clef_api_ici'
    ) {
      return res.json({
        success: false,
        error: 'ElevenLabs API key not configured',
        fallbackToTTS: true,
      });
    }

    // Test avec un message court
    const testText = 'Hello! This is a voice test for PRISM.';

    const audioUrl = await generateElevenLabsAudio(testText, null, {
      id: voiceId,
      name: voiceName,
      provider: 'elevenlabs',
    });

    res.json({
      success: true,
      audioUrl: audioUrl,
      voice: {
        id: voiceId,
        name: voiceName,
      },
    });
  } catch (error) {
    console.error('[Voice Test] Error:', error.message);
    res.json({
      success: false,
      error: error.message,
      fallbackToTTS: true,
    });
  }
});

// Route pour lister les voix ElevenLabs disponibles
app.get('/api/voices', async (req, res) => {
  try {
    if (
      !config.config.CONFIG.ELEVENLABS.API_KEY ||
      config.config.CONFIG.ELEVENLABS.API_KEY === 'ta_clef_api_ici'
    ) {
      return res.json({
        success: false,
        error: 'ElevenLabs non configuré',
        voices: [],
      });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.config.CONFIG.ELEVENLABS.API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${response.status}`);
    }

    const data = await response.json();

    // Filtrer et formater les voix pour l'interface
    const formattedVoices = data.voices
      .filter((voice) => voice.available_for_tiers && voice.available_for_tiers.length === 0) // Voix disponibles
      .map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || 'en',
        gender: voice.labels?.gender || 'unknown',
        accent: voice.labels?.accent || 'standard',
        descriptive: voice.labels?.descriptive || '',
        age: voice.labels?.age || '',
        use_case: voice.labels?.use_case || '',
        preview_url: voice.preview_url,
        category: voice.category || 'premade',
      }))
      .sort((a, b) => {
        // Prioriser les voix françaises
        if (a.language === 'fr' && b.language !== 'fr') return -1;
        if (a.language !== 'fr' && b.language === 'fr') return 1;
        // Puis trier par nom
        return a.name.localeCompare(b.name);
      });

    res.json({
      success: true,
      voices: formattedVoices,
      currentVoiceId: config.config.CONFIG.ELEVENLABS.VOICE_ID,
      totalAvailable: formattedVoices.length,
    });
  } catch (error) {
    console.error('[PRISM API] ❌ Erreur récupération voix:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      voices: [],
    });
  }
});

// Route pour changer la voix active
app.post('/api/set-voice', async (req, res) => {
  try {
    const { voiceId } = req.body;

    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: 'Voice ID requis',
      });
    }

    // Mettre à jour la configuration temporairement (pour cette session)
    config.config.CONFIG.ELEVENLABS.VOICE_ID = voiceId;

    res.json({
      success: true,
      message: 'Voix changée avec succès',
      newVoiceId: voiceId,
    });
  } catch (error) {
    console.error('[PRISM API] ❌ Erreur changement voix:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour le dashboard investisseur
app.get('/investor', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo/investor-dashboard/index.html'));
});

// Route pour le dashboard corporate
app.get('/corporate', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-corporate.html'));
});

// Route pour les demos
app.use('/demo', express.static(path.join(__dirname, 'demo')));

// Route pour les assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ✨ NOUVEAU: Routes pour l'upload de fichiers Excel dans le chat
if (chatUploadRouter) {
  app.use('/api/chat', chatUploadRouter);
  console.log('[ROUTES] ✅ /api/chat/upload route active');
}

// API pour les métriques du dashboard
app.get('/api/metrics', (req, res) => {
  const metrics = {
    revenue: { value: 2300000, label: '€2.3M', growth: 23.5 },
    users: { value: 12500, label: '12.5K', growth: 18.2 },
    uptime: { value: 99.97, label: '99.97%', growth: 0.1 },
    accuracy: { value: 99.8, label: '99.8%', growth: 2.3 },
    latency: { value: 47, label: '47ms', growth: -12.4 },
    security: { value: 100, label: 'Zero', growth: 0 },
  };

  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// API Export PDF Premium
// ============================================================================

import { PdfExportService } from './src/export/PdfExportService.js';

const pdfExportService = new PdfExportService();

// ============================================================================
// ENDPOINT GÉNÉRATION D'IMAGES - Nano Banana Pro
// ============================================================================

/**
 * Génère une image via Nano Banana Pro
 * POST /api/generate-image
 */
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, taskType, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt requis pour la génération d'image",
      });
    }

    console.log(
      `[Image Generation] Prompt: "${prompt.substring(0, 50)}..." | TaskType: ${taskType}`
    );

    // Générer l'image
    const result = await imageGenerator.generateForChat(
      {
        message: prompt,
        taskType: taskType || 'general',
        previousMessages: options.previousMessages || [],
      },
      options
    );

    if (!result.success) {
      console.warn(`[Image Generation] Échec: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    console.log(`[Image Generation] ✅ Image générée avec succès`);

    res.json({
      success: true,
      imageUrl: result.imageUrl,
      downloadUrl: result.downloadUrl,
      downloadFilename: result.downloadFilename,
      html: result.html,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[Image Generation] Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Vérifie si un message est une demande d'image
 * POST /api/check-image-request
 */
app.post('/api/check-image-request', (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message requis',
      });
    }

    const isImageRequest = imageGenerator.isImageRequest(message);

    res.json({
      success: true,
      isImageRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint d'export PDF des conversations
app.post('/api/export/pdf', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Liste de messages requise',
      });
    }

    console.log(`[PDF Export] Génération PDF pour ${messages.length} messages`);

    // Convertir les timestamps string en Date
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp || Date.now()),
    }));

    // Générer le PDF
    const result = await pdfExportService.generateForDownload(formattedMessages, {
      title: options.title || 'Conversation PRISM',
      author: options.author || 'PRISM User',
      includeCoverPage: options.includeCoverPage !== false,
      includePageNumbers: options.includePageNumbers !== false,
      includeHeader: options.includeHeader !== false,
      includeFooter: options.includeFooter !== false,
      includeSummaryPage: options.includeSummaryPage || false,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    console.log(`[PDF Export] ✅ PDF généré: ${result.fileSizeFormatted}`);

    // Envoyer le PDF en téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (error) {
    console.error('[PDF Export] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint pour prévisualiser les stats avant export
app.post('/api/export/pdf/preview', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Liste de messages requise',
      });
    }

    const formattedMessages = messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp || Date.now()),
    }));

    const stats = pdfExportService.calculateStats(formattedMessages);

    res.json({
      success: true,
      stats,
      estimatedPages: Math.ceil(messages.length / 10) + 2, // Estimation
      themes: ['prism-corporate', 'prism-light', 'prism-executive'],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;

// Démarre l'écoute HTTP. Extrait en fonction pour que l'import du module (tests
// supertest) NE lie PAS de port : seul un lancement direct (`node server.js`)
// déclenche `app.listen` via le guard d'import ci-dessous.
function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log('🚀 Serveur PRISM avec ElevenLabs démarré');
    console.log(`✨ Interface disponible sur: http://localhost:${port}`);
    console.log(`🎤 API Chat: http://localhost:${port}/api/chat`);
    console.log(`🔊 Test vocal: http://localhost:${port}/api/test-voice`);
    console.log('🎯 PRISM Voice Chat V2 - Prêt !');

    // Vérifier la configuration ElevenLabs
    const elevenlabs = config.config.CONFIG.ELEVENLABS;
    if (elevenlabs.API_KEY && elevenlabs.API_KEY !== 'ta_clef_api_ici') {
      console.log('✅ ElevenLabs configuré - Synthèse vocale premium active');
    } else {
      console.log('⚠️ ElevenLabs non configuré - Fallback sur TTS navigateur');
      console.log('💡 Configurez ELEVENLABS_API_KEY pour activer la synthèse premium');
    }
  });
}

// Guard d'import (ESM) : ne démarrer le serveur que lorsque ce fichier est
// exécuté directement (`node server.js` / `npm start`), pas lorsqu'il est
// importé par un harnais de test.
if (process.argv[1] === __filename) {
  startServer();
}

export { app, startServer, generateElevenLabsAudio };
