/**
 * ChatFileProcessor - Processeur de fichiers pour le chat
 *
 * Gère l'upload et l'analyse de fichiers directement dans l'interface de chat.
 * Supporte les fichiers Excel, CSV et autres formats de données.
 *
 * @module src/chat/ChatFileProcessor
 */

import { FileContextManager } from './FileContextManager.js';
import { ExcelAnalyzer } from '../excel/ExcelAnalyzer.js';
import path from 'node:path';

/**
 * Types de fichiers supportés avec leurs MIME types
 */
const SUPPORTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'text/csv': 'csv',
  'application/csv': 'csv',
  'text/plain': 'csv', // Parfois les CSV sont envoyés comme text/plain
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
};

/**
 * Mapping extension -> type
 */
const EXTENSION_MAP = {
  '.xlsx': 'xlsx',
  '.xls': 'xls',
  '.csv': 'csv',
  '.ods': 'ods',
};

/**
 * Patterns pour détecter l'intention d'analyse
 */
const ANALYSIS_INTENT_PATTERNS = {
  general_analysis: [/analy[sz]e/i, /examine/i, /look at/i, /check/i, /résumé/i],
  time_series: [/trend/i, /over time/i, /evolution/i, /temporal/i, /chronolog/i],
  comparison: [/compar/i, /versus/i, /vs\.?/i, /difference/i, /between/i],
  aggregation: [/average/i, /mean/i, /sum/i, /total/i, /count/i, /moyenne/i],
  outlier_detection: [/outlier/i, /anomal/i, /unusual/i, /extreme/i, /aberrant/i],
  correlation: [/correlat/i, /relation/i, /link/i, /associat/i],
  distribution: [/distribut/i, /histogram/i, /spread/i, /répartition/i],
};

/**
 * ChatFileProcessor - Classe principale
 */
export class ChatFileProcessor {
  /**
   * @param {Object} options - Options de configuration
   */
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
      contextTTL: options.contextTTL || 30 * 60 * 1000, // 30 min
      processingTimeout: options.processingTimeout || 60000, // 60s
      enableAI: options.enableAI !== false,
      ...options,
    };

    this.fileContextManager = new FileContextManager({
      contextTTL: this.options.contextTTL,
      maxFileSize: this.options.maxFileSize,
    });

    this.excelAnalyzer = new ExcelAnalyzer({
      maxFileSize: this.options.maxFileSize,
      enableAI: this.options.enableAI,
    });

    this.supportedTypes = ['xlsx', 'xls', 'csv', 'ods'];
  }

  /**
   * Détecte le type de fichier
   * @param {Object} file - Objet fichier
   * @returns {string} Type de fichier
   */
  detectFileType(file) {
    // 1. Essayer par MIME type
    const mimeType = SUPPORTED_FILE_TYPES[file.mimetype];
    if (mimeType) {
      return mimeType;
    }

    // 2. Essayer par extension
    if (file.originalname) {
      const ext = path.extname(file.originalname).toLowerCase();
      const extType = EXTENSION_MAP[ext];
      if (extType) {
        return extType;
      }
    }

    // 3. Non supporté
    throw new Error(`Unsupported file type: ${file.mimetype}`);
  }

  /**
   * Valide un fichier avant traitement
   * @param {Object} file - Fichier à valider
   * @returns {boolean} True si valide
   */
  validateFile(file) {
    if (!file) {
      throw new Error('File is required');
    }

    if (!file.buffer) {
      throw new Error('File buffer is required');
    }

    if (file.buffer.length === 0 || file.size === 0) {
      throw new Error('File is empty');
    }

    if (file.buffer.length > this.options.maxFileSize) {
      throw new Error(`File size exceeds limit (${this.options.maxFileSize} bytes)`);
    }

    return true;
  }

  /**
   * Sanitize le nom de fichier
   * @param {string} fileName - Nom de fichier
   * @returns {string} Nom sanitisé
   */
  sanitizeFileName(fileName) {
    if (!fileName) return 'unknown';

    // Supprimer les caractères dangereux
    return fileName
      .replaceAll(/\.\./g, '')
      .replace(/[/\\]/g, '_')
      .replaceAll(/[<>:"|?*]/g, '_')
      .substring(0, 255);
  }

  /**
   * Détecte l'intention d'analyse depuis le message
   * @param {string} message - Message utilisateur
   * @returns {string} Type d'analyse détecté
   */
  detectAnalysisIntent(message) {
    const lowerMessage = message.toLowerCase();

    for (const [intent, patterns] of Object.entries(ANALYSIS_INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          return intent;
        }
      }
    }

    return 'general_analysis';
  }

  /**
   * Traite un message avec fichier attaché
   * @param {string} message - Message utilisateur
   * @param {Object} file - Fichier attaché
   * @param {string} sessionId - ID de session
   * @returns {Promise<Object>} Résultat du traitement
   */
  async processMessageWithFile(message, file, sessionId) {
    // Validation
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('Session ID is required');
    }

    try {
      this.validateFile(file);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
        userMessage: `Erreur de validation: ${error.message}`,
      };
    }

    // Détection du type
    let fileType;
    try {
      fileType = this.detectFileType(file);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_TYPE',
          message: error.message,
        },
        userMessage:
          "Ce type de fichier n'est pas supporté. Formats acceptés: Excel (.xlsx, .xls), CSV.",
      };
    }

    // Stocker le contexte du fichier
    const sanitizedName = this.sanitizeFileName(file.originalname);
    const fileContext = await this.fileContextManager.store(sessionId, file, {
      originalName: sanitizedName,
      type: fileType,
      uploadedAt: new Date().toISOString(),
    });

    // Détecter l'intention d'analyse
    const analysisType = this.detectAnalysisIntent(message);

    // Options d'analyse basées sur l'intention
    const analysisOptions = {
      userQuery: message,
      analysisType,
      generateSummary: true,
      computeCorrelations: analysisType === 'correlation',
      detectOutliers: analysisType === 'outlier_detection',
      analyzeDistributions: analysisType === 'distribution',
      checkDataQuality: true,
    };

    try {
      // Analyser le fichier
      const analysis = await this.excelAnalyzer.analyzeWithAI(file.buffer, message);

      if (!analysis.success) {
        console.error('[ChatFileProcessor] Analysis failed:', analysis.error);
        return {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: analysis.error?.message || 'Parsing failed',
          },
          userMessage: "Impossible de lire ce fichier. Vérifiez qu'il n'est pas corrompu.",
        };
      }

      // Enrichir le contexte
      await this.fileContextManager.enrichContext(sessionId, {
        columns: analysis.sheets?.[0]?.headers,
        analysis: analysis.summary,
        statistics: analysis.sheets?.[0]?.statistics,
        parsedData: analysis.parsedData,
      });

      // Générer la réponse
      const chatResponse = this.excelAnalyzer.exportForChat(analysis);

      return {
        success: true,
        response: chatResponse.text,
        analysis,
        aiInsights: analysis.aiInsights,
        fileContext: fileContext.id,
        metadata: {
          fileName: sanitizedName,
          fileType,
          rowCount: analysis.metadata?.totalRows,
          columnCount: analysis.metadata?.totalColumns,
          analyzedAt: new Date().toISOString(),
          analysisTimeMs: analysis.metadata?.analysisTimeMs || 0,
        },
        analysisOptions,
        visualizations: this._generateVisualizations(analysis),
        queryType: analysisType,
      };
    } catch (error) {
      console.error('[ChatFileProcessor] Processing error:', error);

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: error.message,
        },
        userMessage: "Une erreur est survenue lors de l'analyse du fichier.",
      };
    }
  }

  /**
   * Traite une question de suivi sur un fichier déjà uploadé
   * @param {string} message - Message utilisateur
   * @param {string} sessionId - ID de session
   * @returns {Promise<Object|null>} Résultat ou null si pas de contexte
   */
  async processFollowUpQuestion(message, sessionId) {
    const context = await this.fileContextManager.get(sessionId);

    if (!context) {
      return null;
    }

    // Construire le prompt enrichi avec le contexte
    const enrichedPrompt = this._buildEnrichedPrompt(message, context);

    // Détecter l'intention
    const analysisType = this.detectAnalysisIntent(message);

    // En production, utiliser TaskTypeProcessor
    // Pour l'instant, retourner le contexte enrichi
    return {
      hasFileContext: true,
      fileContext: context.id,
      fileName: context.metadata.originalName,
      enrichedPrompt,
      analysisType,
      columns: context.columns,
      statistics: context.statistics,
    };
  }

  /**
   * Construit un prompt enrichi avec le contexte fichier
   * @private
   */
  _buildEnrichedPrompt(message, context) {
    return `
L'utilisateur a précédemment uploadé le fichier "${context.metadata.originalName}".

Contexte du fichier:
- Type: ${context.metadata.type}
- Colonnes: ${context.columns?.join(', ') || 'N/A'}
- Résumé: ${JSON.stringify(context.analysis || {}, null, 2)}

Statistiques disponibles:
${JSON.stringify(context.statistics || {}, null, 2)}

Question de l'utilisateur: ${message}

Réponds en utilisant les données du fichier.
`;
  }

  /**
   * Génère les visualisations pour le chat
   * @private
   */
  _generateVisualizations(analysis) {
    const visualizations = [];

    if (!analysis.success) return visualizations;

    const sheet = analysis.sheets?.[0];
    if (!sheet) return visualizations;

    // Histogrammes pour colonnes numériques
    if (sheet.distributions) {
      for (const [col, dist] of Object.entries(sheet.distributions)) {
        if (dist.histogram) {
          visualizations.push({
            type: 'histogram',
            column: col,
            data: dist.histogram,
            title: `Distribution: ${col}`,
          });
        }
      }
    }

    // Corrélations
    if (analysis.strongCorrelations?.length > 0) {
      visualizations.push({
        type: 'correlation_list',
        data: analysis.strongCorrelations,
        title: 'Corrélations fortes',
      });
    }

    return visualizations;
  }
}

export default ChatFileProcessor;
