/**
 * Route d'export Enterprise PDF
 * Phase 2 - Micro-étape 2.1 - TDD Cycle GREEN
 * 
 * Route principale avec validation, sécurité, middleware, orchestration services
 */

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

// Import des services Phase 1 (déjà testés et validés)
const { EnterpriseDetectionService } = require('../services/enterpriseDetectionService.js');
const { EnterpriseSanitizer } = require('../services/enterpriseSanitizer.js');
const { EnterprisePDFService } = require('../services/enterprisePDFService.js');

// Import des middleware Phase 2
const {
  validateEnterpriseExportRequest,
  sanitizeInput,
  checkPayloadSize
} = require('../middleware/validation.js');

const {
  enterpriseExportRateLimit,
  csrfProtection,
  getCSRFToken,
  securityHeaders,
  requestTimeout,
  securityLogger,
  sanitizeErrors
} = require('../middleware/security.js');

const router = express.Router();

// Store pour les fichiers générés (en production, utiliser un stockage persistant)
const generatedFiles = new Map();

// Services instances - peut être injecté pour les tests
let serviceInstances = {
  detectionService: null,
  sanitizer: null,
  pdfService: null
};

// Fonction d'injection de services pour les tests
function injectServices(detection, sanitizer, pdf) {
  serviceInstances.detectionService = detection;
  serviceInstances.sanitizer = sanitizer;
  serviceInstances.pdfService = pdf;
  console.log('[SERVICES] Custom services injected for testing');
}

// Initialisation paresseuse des services (production) ou utilisation des injectés (tests)
function initializeServices() {
  if (!serviceInstances.detectionService) {
    serviceInstances.detectionService = new EnterpriseDetectionService();
  }
  if (!serviceInstances.sanitizer) {
    serviceInstances.sanitizer = new EnterpriseSanitizer();
  }
  if (!serviceInstances.pdfService) {
    serviceInstances.pdfService = new EnterprisePDFService();
  }
}

// Helper pour obtenir les services (avec initialisation auto)
function getServices() {
  initializeServices();
  return serviceInstances;
}

// Middleware globaux pour toutes les routes enterprise export
router.use(securityHeaders);
router.use(securityLogger);
router.use(express.json({ limit: '10mb' }));

// Route pour obtenir un token CSRF
router.get('/csrf-token', getCSRFToken);

// Route principale d'export Enterprise
router.post('/enterprise-report',
  checkPayloadSize,
  enterpriseExportRateLimit,
  csrfProtection,
  requestTimeout(10000), // 10s timeout
  validateEnterpriseExportRequest,
  sanitizeInput,
  generateEnterpriseReport
);

/**
 * Générateur principal de rapport Enterprise
 */
async function generateEnterpriseReport(req, res) {
  const startTime = Date.now();
  const data = req.sanitizedData;
  const requestId = data.requestId || crypto.randomUUID().substring(0, 8);

  console.log('[ENTERPRISE] Report generation started', {
    timestamp: new Date().toISOString(),
    requestId,
    reportType: data.metadata.reportType,
    contentLength: data.content.length,
    ip: req.ip
  });

  let timings = {
    validation: req.validationTime || 0,
    sanitization: 0,
    detection: 0,
    sanitize: 0,
    generation: 0,
    storage: 0
  };

  try {
    // Initialiser les services si nécessaire
    const services = getServices();

    // ÉTAPE 1: Détection Enterprise
    const detectionStart = Date.now();
    
    const isEnterprise = services.detectionService.isEnterpriseReport(data.content, data.metadata);
    
    if (!isEnterprise) {
      console.log('[ENTERPRISE] Content not suitable for enterprise report', {
        timestamp: new Date().toISOString(),
        requestId,
        contentLength: data.content.length
      });

      return res.status(422).json({
        success: false,
        error: 'Content not suitable for enterprise report',
        details: {
          reason: 'Content does not meet enterprise report criteria',
          suggestions: [
            'Ensure content contains business analysis',
            'Include metrics or strategic insights',
            'Use professional tone and formatting'
          ]
        },
        requestId
      });
    }

    const detectedReportType = services.detectionService.getReportType(data.content);
    timings.detection = Date.now() - detectionStart;

    console.log('[ENTERPRISE] Content validated as enterprise report', {
      timestamp: new Date().toISOString(),
      requestId,
      detectedType: detectedReportType,
      providedType: data.metadata.reportType,
      detectionTime: timings.detection + 'ms'
    });

    // ÉTAPE 2: Sanitisation Enterprise
    const sanitizeStart = Date.now();
    
    const sanitizationResult = services.sanitizer.removeEmojisAndCasualContent(
      data.content, 
      data.metadata
    );
    
    timings.sanitize = Date.now() - sanitizeStart;

    console.log('[ENTERPRISE] Content sanitized', {
      timestamp: new Date().toISOString(),
      requestId,
      changes: sanitizationResult.changes,
      originalLength: data.content.length,
      sanitizedLength: sanitizationResult.content.length,
      sanitizeTime: timings.sanitize + 'ms'
    });

    // ÉTAPE 3: Génération PDF
    const generationStart = Date.now();
    
    const sanitizedData = {
      content: sanitizationResult.content,
      metadata: {
        ...data.metadata,
        reportType: detectedReportType, // Utiliser le type détecté
        sanitizationChanges: sanitizationResult.changes,
        requestId,
        generatedAt: new Date().toISOString()
      },
      options: data.options || {},
      metrics: {
        enterpriseScore: sanitizationResult.enterpriseScore || 85,
        qualityScore: sanitizationResult.qualityScore || 82
      }
    };

    const pdfResult = await services.pdfService.generateExecutiveReport(sanitizedData);
    
    if (!pdfResult || !pdfResult.success) {
      throw new Error('PDF generation failed: ' + (pdfResult?.error || 'Unknown error'));
    }

    timings.generation = Date.now() - generationStart;

    console.log('[ENTERPRISE] PDF generated successfully', {
      timestamp: new Date().toISOString(),
      requestId,
      pages: pdfResult.metadata.pages,
      size: pdfResult.metadata.size,
      generationTime: timings.generation + 'ms'
    });

    // ÉTAPE 4: Stockage du fichier
    const storageStart = Date.now();
    
    const filename = `enterprise-report-${requestId}-${Date.now()}.pdf`;
    const downloadId = crypto.randomUUID();
    const downloadUrl = `/download/${downloadId}.pdf`;

    // Stocker le fichier en mémoire (en production, utiliser un stockage persistant)
    generatedFiles.set(downloadId, {
      filename,
      buffer: pdfResult.pdfBuffer,
      metadata: pdfResult.metadata,
      createdAt: Date.now(),
      requestId,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24h
    });

    timings.storage = Date.now() - storageStart;

    // Calcul des timings totaux
    timings.totalTime = Date.now() - startTime;

    console.log('[ENTERPRISE] Report generation completed', {
      timestamp: new Date().toISOString(),
      requestId,
      totalTime: timings.totalTime + 'ms',
      downloadUrl,
      fileSize: pdfResult.metadata.size
    });

    // Cleanup des fichiers expirés (async)
    cleanupExpiredFiles().catch(err => {
      console.error('[ENTERPRISE] Cleanup error:', err.message);
    });

    // Réponse de succès
    res.json({
      success: true,
      data: {
        downloadUrl,
        metadata: {
          title: sanitizedData.metadata.title,
          reportType: sanitizedData.metadata.reportType,
          pages: pdfResult.metadata.pages,
          size: pdfResult.metadata.size,
          format: 'pdf',
          generatedAt: sanitizedData.metadata.generatedAt,
          generator: 'PRISM Enterprise',
          version: '1.0.0',
          confidentiality: sanitizedData.metadata.confidentiality,
          sanitizationChanges: sanitizationResult.changes
        }
      },
      processing: {
        detectionTime: timings.detection,
        sanitizationTime: timings.sanitize,
        generationTime: timings.generation,
        totalTime: timings.totalTime,
        requestId
      }
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    
    console.error('[ENTERPRISE] Report generation failed', {
      timestamp: new Date().toISOString(),
      requestId,
      error: error.message,
      errorTime: errorTime + 'ms',
      stack: error.stack?.substring(0, 500),
      ip: req.ip
    });

    // Déterminer le type d'erreur et le code de statut approprié
    let statusCode = 500;
    let errorMessage = 'PDF generation failed';

    if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timeout';
    } else if (error.message.includes('memory')) {
      statusCode = 507;
      errorMessage = 'Insufficient storage';
    } else if (error.message.includes('validation')) {
      statusCode = 400;
      errorMessage = 'Validation error';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: {
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error during report generation',
        requestId,
        errorTime
      },
      processing: {
        detectionTime: timings.detection,
        sanitizationTime: timings.sanitize,
        totalTime: errorTime
      }
    });
  }
}

// Route de téléchargement des fichiers générés
router.get('/download/:fileId', async (req, res) => {
  const fileId = req.params.fileId.replace('.pdf', ''); // Retirer l'extension
  const file = generatedFiles.get(fileId);

  if (!file) {
    console.log('[ENTERPRISE] File not found', {
      timestamp: new Date().toISOString(),
      fileId,
      ip: req.ip
    });

    return res.status(404).json({
      success: false,
      error: 'File not found or expired',
      details: {
        message: 'The requested file does not exist or has expired',
        maxAge: '24 hours'
      }
    });
  }

  // Vérifier expiration
  if (Date.now() > file.expiresAt) {
    generatedFiles.delete(fileId);
    
    console.log('[ENTERPRISE] File expired', {
      timestamp: new Date().toISOString(),
      fileId,
      requestId: file.requestId,
      age: Math.floor((Date.now() - file.createdAt) / 1000) + 's'
    });

    return res.status(410).json({
      success: false,
      error: 'File expired',
      details: {
        message: 'The requested file has expired and is no longer available'
      }
    });
  }

  console.log('[ENTERPRISE] File download started', {
    timestamp: new Date().toISOString(),
    fileId,
    requestId: file.requestId,
    filename: file.filename,
    size: file.buffer.length,
    ip: req.ip
  });

  // Headers pour le téléchargement
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('Content-Length', file.buffer.length);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.send(file.buffer);
});

// Route de statut pour monitoring
router.get('/status', (req, res) => {
  const fileCount = generatedFiles.size;
  const totalSize = Array.from(generatedFiles.values())
    .reduce((sum, file) => sum + file.buffer.length, 0);

  res.json({
    success: true,
    status: 'operational',
    metrics: {
      activeFiles: fileCount,
      totalStorageUsed: Math.floor(totalSize / 1024) + 'KB',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    services: {
      detection: !!serviceInstances.detectionService,
      sanitizer: !!serviceInstances.sanitizer,
      pdfGenerator: !!serviceInstances.pdfService
    }
  });
});

/**
 * Nettoyage des fichiers expirés
 */
async function cleanupExpiredFiles() {
  const now = Date.now();
  const expiredKeys = [];

  for (const [key, file] of generatedFiles.entries()) {
    if (now > file.expiresAt) {
      expiredKeys.push(key);
    }
  }

  if (expiredKeys.length > 0) {
    expiredKeys.forEach(key => generatedFiles.delete(key));
    
    console.log('[ENTERPRISE] Cleanup completed', {
      timestamp: new Date().toISOString(),
      removedFiles: expiredKeys.length,
      remainingFiles: generatedFiles.size
    });
  }
}

// Gestionnaire d'erreurs global pour ce router
router.use(sanitizeErrors);

module.exports = { 
  router: router, 
  enterpriseExportRouter: router,
  injectServices // Export pour les tests
}; 