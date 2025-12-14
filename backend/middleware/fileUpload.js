/**
 * File Upload Middleware - Middleware Multer pour PRISM
 * 
 * Gère l'upload sécurisé de fichiers pour l'analyse Excel/CSV.
 * Inclut validation, rate limiting et sécurité.
 * 
 * @module backend/middleware/fileUpload
 */

import multer from 'multer';

/**
 * Configuration des types MIME autorisés
 */
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/csv',
  'text/plain', // Parfois CSV
  'application/vnd.oasis.opendocument.spreadsheet' // ods
];

/**
 * Extensions autorisées
 */
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods'];

/**
 * Taille maximale (50MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Configuration du stockage en mémoire
 */
const storage = multer.memoryStorage();

/**
 * Filtre de fichiers
 */
const fileFilter = (req, file, cb) => {
  // Vérifier le type MIME
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Vérifier l'extension comme fallback
    const ext = file.originalname?.toLowerCase()?.match(/\.[^.]+$/)?.[0];
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(`Type de fichier non autorisé. Formats acceptés: ${ALLOWED_EXTENSIONS.join(', ')}`),
        false
      );
    }
  }
  
  cb(null, true);
};

/**
 * Instance Multer configurée
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Un seul fichier à la fois
  }
});

/**
 * Middleware de validation de fichier Excel
 * À utiliser après multer
 */
export const validateExcelFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'NO_FILE',
        message: 'Aucun fichier fourni'
      }
    });
  }

  // Vérifier que le buffer n'est pas vide
  if (!req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'EMPTY_FILE',
        message: 'Le fichier est vide'
      }
    });
  }

  // Vérifier les magic bytes pour les fichiers Excel
  const buffer = req.file.buffer;
  
  // XLSX (ZIP format) - PK signature
  const isXLSX = buffer[0] === 0x50 && buffer[1] === 0x4B;
  
  // XLS (OLE2 format)
  const isXLS = buffer[0] === 0xD0 && buffer[1] === 0xCF;
  
  // CSV (texte)
  const isCSV = req.file.mimetype === 'text/csv' || 
                req.file.mimetype === 'text/plain' ||
                req.file.originalname?.endsWith('.csv');

  if (!isXLSX && !isXLS && !isCSV) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: 'Le fichier ne semble pas être un fichier Excel ou CSV valide'
      }
    });
  }

  next();
};

/**
 * Middleware de gestion des erreurs Multer
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Le fichier dépasse la taille maximale autorisée (${MAX_FILE_SIZE / 1024 / 1024}MB)`
        }
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Un seul fichier à la fois est autorisé'
        }
      });
    }
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message
      }
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_ERROR',
        message: err.message
      }
    });
  }

  next();
};

/**
 * Rate limiter pour les uploads
 */
export const uploadRateLimiter = (req, res, next) => {
  // En production, utiliser express-rate-limit avec Redis
  // Pour l'instant, rate limiting simple en mémoire
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!uploadRateLimiter._requests) {
    uploadRateLimiter._requests = new Map();
  }
  
  const requests = uploadRateLimiter._requests;
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 uploads par minute
  
  // Nettoyer les anciennes entrées
  for (const [key, data] of requests) {
    if (now - data.firstRequest > windowMs) {
      requests.delete(key);
    }
  }
  
  const ipData = requests.get(ip);
  
  if (!ipData) {
    requests.set(ip, { count: 1, firstRequest: now });
  } else if (ipData.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: 'Trop de requêtes. Veuillez réessayer dans une minute.'
      }
    });
  } else {
    ipData.count++;
  }
  
  next();
};

export default {
  upload,
  validateExcelFile,
  handleMulterError,
  uploadRateLimiter
};
