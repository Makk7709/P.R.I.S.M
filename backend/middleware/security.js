/**
 * Middleware de sécurité pour Enterprise Export
 * Phase 2 - Micro-étape 2.1
 * 
 * Rate limiting, CSRF protection, security headers
 */

const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Store pour les tokens CSRF en mémoire (en production, utiliser Redis)
const csrfTokenStore = new Map();

// Store pour le rate limiting par IP
const rateLimitStore = new Map();

/**
 * Configuration du rate limiting pour Enterprise Export
 * 5 requêtes par minute par IP
 */
const enterpriseExportRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requêtes max par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  
  // Store personnalisé pour tracking
  store: {
    incr: (key) => {
      const now = Date.now();
      const window = Math.floor(now / (60 * 1000)); // Fenêtre de 1 minute
      const storeKey = `${key}-${window}`;
      
      if (!rateLimitStore.has(storeKey)) {
        rateLimitStore.set(storeKey, { count: 0, resetTime: (window + 1) * 60 * 1000 });
      }
      
      const record = rateLimitStore.get(storeKey);
      record.count++;
      
      // Cleanup des anciennes entrées
      for (const [oldKey, oldRecord] of rateLimitStore.entries()) {
        if (oldRecord.resetTime < now) {
          rateLimitStore.delete(oldKey);
        }
      }
      
      return Promise.resolve({
        totalHits: record.count,
        resetTime: new Date(record.resetTime)
      });
    },
    
    decrement: (key) => {
      // Pas d'implémentation nécessaire pour notre cas d'usage
      return Promise.resolve();
    },
    
    resetKey: (key) => {
      const now = Date.now();
      const window = Math.floor(now / (60 * 1000));
      const storeKey = `${key}-${window}`;
      rateLimitStore.delete(storeKey);
      return Promise.resolve();
    }
  },
  
  keyGenerator: (req) => {
    // Utiliser l'IP et User-Agent pour une identification plus précise
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    return crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex').substring(0, 16);
  },
  
  handler: (req, res) => {
    console.log('[SECURITY] Rate limit exceeded', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      endpoint: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      details: {
        message: 'Too many export requests. Please try again later.',
        retryAfter: '60 seconds',
        maxRequests: 5,
        windowMs: 60000
      }
    });
  }
});

/**
 * Génération de token CSRF
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware de protection CSRF
 */
const csrfProtection = (req, res, next) => {
  const method = req.method.toLowerCase();
  
  // Les requêtes GET sont exemptées (pour récupérer le token)
  if (method === 'get') {
    return next();
  }

  const token = req.get('X-CSRF-Token') || req.body.csrfToken;
  const sessionId = req.get('X-Session-ID') || req.ip; // Fallback sur IP si pas de session

  if (!token) {
    console.log('[SECURITY] CSRF token missing', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing or invalid',
      details: {
        message: 'Security token required for this operation',
        header: 'X-CSRF-Token'
      }
    });
  }

  const storedToken = csrfTokenStore.get(sessionId);
  
  if (!storedToken || storedToken.token !== token) {
    console.log('[SECURITY] CSRF token invalid', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      path: req.path,
      tokenPresent: !!token,
      storedTokenPresent: !!storedToken
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing or invalid',
      details: {
        message: 'Invalid or expired security token',
        action: 'Refresh page and try again'
      }
    });
  }

  // Vérifier expiration du token (30 minutes)
  const tokenAge = Date.now() - storedToken.createdAt;
  if (tokenAge > 30 * 60 * 1000) { // 30 minutes
    csrfTokenStore.delete(sessionId);
    
    console.log('[SECURITY] CSRF token expired', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      tokenAge: Math.floor(tokenAge / 1000) + 's'
    });

    return res.status(403).json({
      success: false,
      error: 'CSRF token missing or invalid',
      details: {
        message: 'Security token has expired',
        action: 'Refresh page to get new token'
      }
    });
  }

  console.log('[SECURITY] CSRF token validated', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    tokenAge: Math.floor(tokenAge / 1000) + 's'
  });

  next();
};

/**
 * Endpoint pour obtenir un token CSRF
 */
const getCSRFToken = (req, res) => {
  const sessionId = req.get('X-Session-ID') || req.ip;
  const token = generateCSRFToken();
  
  csrfTokenStore.set(sessionId, {
    token,
    createdAt: Date.now()
  });

  // Cleanup des tokens expirés
  const now = Date.now();
  for (const [key, value] of csrfTokenStore.entries()) {
    if (now - value.createdAt > 30 * 60 * 1000) { // 30 minutes
      csrfTokenStore.delete(key);
    }
  }

  console.log('[SECURITY] CSRF token generated', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    sessionId: sessionId.substring(0, 8) + '...' // Log partiel pour sécurité
  });

  res.json({
    success: true,
    csrfToken: token,
    expiresIn: 30 * 60 * 1000, // 30 minutes en ms
    usage: 'Include in X-CSRF-Token header for POST requests'
  });
};

/**
 * Middleware de sécurité headers
 */
const securityHeaders = (req, res, next) => {
  // Headers de sécurité pour l'API
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CSP strict pour l'API
  res.setHeader('Content-Security-Policy', 
    "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none';"
  );

  console.log('[SECURITY] Security headers applied', {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    path: req.path
  });

  next();
};

/**
 * Middleware de timeout pour les requêtes
 */
const requestTimeout = (timeoutMs = 10000) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      console.log('[SECURITY] Request timeout', {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        path: req.path,
        timeout: timeoutMs + 'ms'
      });

      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout',
          details: {
            message: 'Report generation took too long',
            maxDuration: Math.floor(timeoutMs / 1000) + 's'
          }
        });
      }
    });

    next();
  };
};

/**
 * Middleware de logging sécurisé
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log de début de requête
  console.log('[SECURITY] Request started', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100),
    contentLength: req.get('Content-Length') || 0,
    requestId: req.body?.requestId || crypto.randomUUID().substring(0, 8)
  });

  // Intercepter la réponse pour logging
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    console.log('[SECURITY] Request completed', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration + 'ms',
      responseSize: Buffer.byteLength(data || '', 'utf8'),
      ip: req.ip
    });

    originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware de nettoyage des erreurs pour éviter l'exposition d'informations sensibles
 */
const sanitizeErrors = (err, req, res, next) => {
  console.error('[SECURITY] Error occurred', {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack?.substring(0, 500), // Stack trace limitée
    path: req.path,
    ip: req.ip
  });

  // Nettoyer l'erreur avant de l'envoyer au client
  const sanitizedError = {
    success: false,
    error: 'Internal server error',
    requestId: req.body?.requestId || 'unknown'
  };

  // En développement, on peut exposer plus d'infos
  if (process.env.NODE_ENV === 'development') {
    sanitizedError.details = {
      message: err.message,
      // Ne jamais exposer la stack trace complète
    };
  }

  res.status(500).json(sanitizedError);
};

module.exports = {
  enterpriseExportRateLimit,
  csrfProtection,
  getCSRFToken,
  securityHeaders,
  requestTimeout,
  securityLogger,
  sanitizeErrors
}; 