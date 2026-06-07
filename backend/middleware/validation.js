/**
 * Middleware de validation pour Enterprise Export
 * Phase 2 - Micro-étape 2.1
 * 
 * Validation schema d'entrée strict, rate limiting, logging sécurisé
 */

import Joi from 'joi';

// Enterprise Export Schema with strict validation matching test expectations
const enterpriseExportSchema = Joi.object({
  content: Joi.string()
    .required()
    .min(50)
    .max(1024 * 1024) // 1MB max
    .messages({
      'string.empty': 'Content is required and must be a non-empty string',
      'string.min': 'Content must be at least 50 characters',
      'string.max': 'Content must not exceed 1MB'
    }),
    
  metadata: Joi.object({
    reportType: Joi.string()
      .valid('executive_summary', 'financial', 'technical', 'strategy', 'analysis')
      .required()
      .messages({
        'any.only': 'Report type must be one of: executive_summary, financial, technical, strategy, analysis'
      }),
    
    title: Joi.string()
      .required()
      .min(3)
      .max(200)
      .pattern(/^[^<>]*$/)
      .messages({
        'string.min': 'Title must be at least 3 characters',
        'string.max': 'Title must not exceed 200 characters',
        'string.pattern.base': 'Title contains potentially unsafe characters'
      }),
    
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
        'string.pattern.base': 'Date must be in ISO format (YYYY-MM-DD)'
      }),
      
    confidentiality: Joi.string()
      .valid('Public', 'Internal', 'Confidential', 'Restricted')
      .required()
      .messages({
        'any.only': 'Confidentiality must be one of: Public, Internal, Confidential, Restricted'
      }),
    
    author: Joi.string()
      .optional()
      .max(100)
      .pattern(/^[^<>]*$/),
    
    department: Joi.string()
      .optional()
      .max(100)
      .pattern(/^[^<>]*$/),
      
    version: Joi.string()
      .optional()
      .pattern(/^\d+\.\d+(\.\d+)?$/)
      .messages({
        'string.pattern.base': 'Version must follow semantic versioning (x.y.z)'
      })
  }).required().messages({
    'object.base': 'Metadata is required'
  }),

  format: Joi.string()
    .valid('pdf')
    .required()
    .messages({
      'any.only': 'Format must be "pdf"'
    }),

  requestId: Joi.string()
    .optional()
    .pattern(/^[a-zA-Z0-9-]+$/)
    .min(10)
    .max(50),
  
  options: Joi.object({
    includeMetrics: Joi.boolean().default(true),
    includeBranding: Joi.boolean().default(true),
    theme: Joi.string().valid('corporate', 'minimal', 'executive').default('corporate'),
    language: Joi.string().valid('fr', 'en').default('fr'),
    watermark: Joi.boolean().default(false)
  }).default()
});

/**
 * Middleware de validation pour les requêtes Enterprise Export
 */
const validateEnterpriseExportRequest = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  try {
    // Handle null body case for error testing
    if (req.body === null || req.body === undefined) {
      throw new Error('Request body is null or undefined');
    }

    // Log sécurisé de la requête (sans données sensibles)
    console.log('[SECURITY] Enterprise export validation started', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      contentLength: req.body?.content?.length || 0,
      requestId: req.body?.requestId || 'unknown'
    });

    // Check for oversized content first (>2MB) - bypass schema validation for security validation
    if (req.body.content && req.body.content.length > 2 * 1024 * 1024) {
      // Create a minimal validation for oversized content
      const oversizedData = {
        content: req.body.content,
        metadata: req.body.metadata || {},
        format: req.body.format,
        requestId: req.body.requestId,
        options: req.body.options || {}
      };
      
      const securityChecks = performSecurityChecks(oversizedData);
      if (!securityChecks.passed) {
        console.log('[SECURITY] Security check failed', {
          timestamp: new Date().toISOString(),
          reason: securityChecks.reason,
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'Security validation failed',
          details: {
            reason: securityChecks.reason,
            suggestions: securityChecks.suggestions
          }
        });
      }
    }

    // Validation du schema
    const { error, value } = enterpriseExportSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: false // Disable conversion to preserve original date format
    });
    
    if (error) {
      const validationTime = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
      
      console.log('[SECURITY] Validation failed', {
        timestamp: new Date().toISOString(),
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        })),
        validationTime,
        ip: req.ip
      });

      // Handle specific error messages for missing required fields
      const firstError = error.details[0];
      let errorMessage = firstError.message;
      
      if (firstError.path[0] === 'content' && firstError.type === 'any.required') {
        errorMessage = 'Content is required and must be a non-empty string';
      } else if (firstError.path[0] === 'metadata' && firstError.type === 'any.required') {
        errorMessage = 'Metadata is required';
      } else if (firstError.path.join('.') === 'metadata.date' && firstError.type === 'string.pattern.base') {
        errorMessage = 'Date must be in ISO format (YYYY-MM-DD)';
      }

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: {
          field: firstError.path.join('.'),
          message: errorMessage,
          allErrors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        },
        validationTime
      });
    }
    
    // Vérifications de sécurité supplémentaires (only for script/iframe/javascript patterns)
    const securityChecks = performSecurityChecks(value);
    if (!securityChecks.passed) {
      console.log('[SECURITY] Security check failed', {
        timestamp: new Date().toISOString(),
        reason: securityChecks.reason,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Security validation failed',
        details: {
          reason: securityChecks.reason,
          suggestions: securityChecks.suggestions
        }
      });
    }

    // Validation réussie
    req.validatedData = value;
    req.validationTime = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms

    console.log('[SECURITY] Validation successful', {
      timestamp: new Date().toISOString(),
      validationTime: req.validationTime,
      reportType: value.metadata.reportType,
      contentLength: value.content.length
    });
    
    next();

  } catch (err) {
    const validationTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    console.error('[SECURITY] Validation error', {
      timestamp: new Date().toISOString(),
      error: err.message,
      validationTime,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      validationTime
    });
  }
};

/**
 * Détecte la présence d'une balise <script>…</script> embarquée (insensible à
 * la casse). Implémentation linéaire O(n) remplaçant la regex
 * /<script[\s\S]*?>[\s\S]*?<\/script>/gi qui provoquait un ReDoS catastrophique
 * sur des payloads du type '<script>x'.repeat(N) (double quantifieur lazy).
 * Sémantique préservée : exige un '>' de fermeture d'ouverture ET un '</script>'.
 */
function containsEmbeddedScriptTag(content) {
  const lower = content.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < content.length) {
    const openIdx = lower.indexOf('<script', searchFrom);
    if (openIdx === -1) {
      return false;
    }

    let tagEnd = openIdx + 7;
    while (tagEnd < content.length && content[tagEnd] !== '>') {
      tagEnd++;
    }
    if (tagEnd >= content.length) {
      searchFrom = openIdx + 1;
      continue;
    }

    if (lower.indexOf('</script>', tagEnd + 1) !== -1) {
      return true;
    }

    searchFrom = openIdx + 1;
  }

  return false;
}

/**
 * Vérifications de sécurité supplémentaires
 */
function performSecurityChecks(data) {
  const checks = {
    passed: true,
    reason: null,
    suggestions: []
  };

  const contentToCheck = data.content + (data.metadata?.title || '');

  // Script embarqué : scanner linéaire (ReDoS-safe, remplace l'ancienne regex)
  if (containsEmbeddedScriptTag(contentToCheck)) {
    checks.passed = false;
    checks.reason = 'Potentially malicious content detected';
    checks.suggestions = [
      'Remove script tags and event handlers',
      'Use plain text or safe markdown formatting',
      'Avoid HTML and JavaScript code'
    ];
    return checks;
  }

  // Autres motifs dangereux (patterns linéaires, pas de backtracking catastrophique)
  const maliciousPatterns = [
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<img[^>]+onerror/gi // Catch malicious img tags with onerror
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(contentToCheck)) {
      checks.passed = false;
      checks.reason = 'Potentially malicious content detected';
      checks.suggestions = [
        'Remove script tags and event handlers',
        'Use plain text or safe markdown formatting',
        'Avoid HTML and JavaScript code'
      ];
      break;
    }
  }

  // Vérification de taille excessive pour le contenu
  if (data.content.length > 2 * 1024 * 1024) { // 2MB
    checks.passed = false;
    checks.reason = 'Content too large for enterprise report';
    checks.suggestions = [
      'Reduce content length to under 2MB',
      'Split large reports into multiple documents',
      'Remove unnecessary formatting or images'
    ];
  }

  // Vérification de caractères suspects
  // Intentional: this security check must detect raw control characters in
  // user content, so matching them is the whole point (not a typo).
  // eslint-disable-next-line no-control-regex
  const suspiciousChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  if (suspiciousChars.test(contentToCheck)) {
    checks.passed = false;
    checks.reason = 'Content contains non-printable characters';
    checks.suggestions = [
      'Remove non-printable control characters',
      'Use standard text encoding',
      'Clean content before submission'
    ];
  }

  return checks;
}

/**
 * Middleware de sanitisation des entrées
 */
const sanitizeInput = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const data = req.validatedData;
    
    // Sanitisation basique du contenu
    data.content = data.content
      // Intentional: strip raw control characters from user content.
      // eslint-disable-next-line no-control-regex
      .replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Supprime caractères de contrôle
      .replaceAll(/\s+/g, ' ') // Normalise les espaces
      .trim();
    
    // Sanitisation du titre - replace control chars with space, then normalize spaces
    data.metadata.title = data.metadata.title
      // Intentional: replace raw control characters in the title with spaces.
      // eslint-disable-next-line no-control-regex
      .replaceAll(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Replace control chars with space
      .replaceAll(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();
    
    const sanitizationTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    // Ajout de métadonnées de traitement
    data.processing = {
      sanitizedAt: new Date().toISOString(),
      sanitizationTime: sanitizationTime,
      requestIP: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    };
    
    req.sanitizedData = data;
    
    console.log('[SECURITY] Input sanitization completed', {
      timestamp: new Date().toISOString(),
      sanitizationTime: sanitizationTime,
      originalLength: req.body.content?.length || 0,
      sanitizedLength: data.content.length
    });
    
    next();

  } catch (err) {
    console.error('[SECURITY] Sanitization error', {
      timestamp: new Date().toISOString(),
      error: err.message,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Input sanitization failed'
    });
  }
};

/**
 * Middleware de vérification de la taille du payload
 */
const checkPayloadSize = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB max
  
  const contentLength = Number.parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    console.log('[SECURITY] Payload too large', {
      timestamp: new Date().toISOString(),
      contentLength,
      maxSize,
      ip: req.ip
    });
    
    return res.status(413).json({
      success: false,
      error: 'Content too large',
      details: {
        maxSize: `${maxSize / (1024 * 1024)}MB`,
        receivedSize: `${(contentLength / (1024 * 1024)).toFixed(2)}MB`
      }
    });
  }
  
  next();
};

export {
  validateEnterpriseExportRequest,
  sanitizeInput,
  checkPayloadSize,
  enterpriseExportSchema
}; 