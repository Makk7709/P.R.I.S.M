/**
 * Types TypeScript pour l'API Enterprise Export PRISM
 * Micro-étape 0.2 - Définition du contrat API
 * 
 * Ces types correspondent exactement au schema OpenAPI 3.0
 * Validation stricte avec contraintes enterprise
 */

/**
 * Classification des niveaux de contenu enterprise
 */
export type ContentClassification = 
  | 'executive_report'
  | 'analytical_response' 
  | 'structured_response'
  | 'casual_response';

/**
 * Formats de sortie supportés
 */
export type ExportFormat = 'pdf' | 'docx';

/**
 * Templates enterprise disponibles
 */
export type EnterpriseTemplate = 'executive' | 'analytical' | 'structured';

/**
 * Langues supportées
 */
export type SupportedLanguage = 'fr' | 'en';

/**
 * Niveaux de classification de document
 */
export type DocumentClassification = 'PUBLIC' | 'INTERNE' | 'CONFIDENTIEL' | 'SECRET';

/**
 * Codes d'erreur standardisés
 */
export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'INVALID_TOKEN' 
  | 'NOT_ENTERPRISE_CONTENT'
  | 'ACCESS_DENIED'
  | 'CONTENT_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'TEMPLATE_ERROR'
  | 'GENERATION_FAILED';

/**
 * Métadonnées du document
 */
export interface DocumentMetadata {
  /** Auteur du rapport (max 100 caractères) */
  author?: string;
  /** Département d'origine (max 100 caractères) */
  department?: string;
  /** Niveau de classification du document */
  classification?: DocumentClassification;
}

/**
 * Options de génération du document
 */
export interface ExportOptions {
  /** Inclure les graphiques dans l'export */
  includeCharts?: boolean;
  /** Filigrane à appliquer (max 50 caractères) */
  watermark?: string;
  /** Langue du document généré */
  language?: SupportedLanguage;
  /** Génération haute résolution (impact performance) */
  highResolution?: boolean;
  /** Inclure les métadonnées dans le document */
  includeMetadata?: boolean;
}

/**
 * Contraintes de validation pour le contenu
 */
export interface ContentConstraints {
  /** Longueur minimale du contenu */
  minLength: number;
  /** Longueur maximale du contenu */
  maxLength: number;
  /** Score minimum enterprise requis */
  minEnterpriseScore: number;
  /** Types de contenu autorisés */
  allowedTypes: ContentClassification[];
}

/**
 * Requête d'export enterprise
 */
export interface EnterpriseExportRequest {
  /** 
   * Contenu du rapport à exporter
   * Validé automatiquement pour niveau enterprise
   * Min: 50 caractères, Max: 1,000,000 caractères
   */
  content: string;
  
  /** Format de sortie du document (défaut: pdf) */
  format?: ExportFormat;
  
  /** Template enterprise à utiliser */
  template?: EnterpriseTemplate;
  
  /** Métadonnées du document */
  metadata?: DocumentMetadata;
  
  /** Options de génération */
  options?: ExportOptions;
}

/**
 * Métadonnées du fichier généré
 */
export interface GeneratedFileMetadata {
  /** Taille du fichier en bytes (minimum: 1) */
  fileSize: number;
  
  /** Nombre de pages du document (minimum: 1) */
  pageCount: number;
  
  /** Template utilisé pour la génération */
  template: string;
  
  /** Format du fichier généré */
  format?: string;
  
  /** Timestamp de génération */
  generatedAt?: string;
  
  /** Temps de traitement en secondes */
  processingTime?: number;
}

/**
 * Réponse d'export enterprise réussie
 */
export interface EnterpriseExportResponse {
  /** Statut de succès (toujours true) */
  success: true;
  
  /** Identifiant unique de l'export (UUID) */
  exportId: string;
  
  /** URL de téléchargement sécurisée (temporaire) */
  downloadUrl: string;
  
  /** Date d'expiration du lien (ISO 8601) */
  expiresAt: string;
  
  /** Métadonnées du fichier généré */
  metadata: GeneratedFileMetadata;
}

/**
 * Détails d'erreur spécifiques
 */
export interface ErrorDetails {
  /** Champ concerné par l'erreur */
  field?: string;
  
  /** Contrainte violée */
  constraint?: string;
  
  /** Valeur reçue */
  received?: any;
  
  /** Valeur attendue */
  expected?: any;
  
  /** Score de contenu (pour erreurs enterprise) */
  contentScore?: number;
  
  /** Score requis */
  requiredScore?: number;
  
  /** Classification du contenu */
  classification?: ContentClassification;
  
  /** Taille actuelle (pour erreurs de taille) */
  currentSize?: number;
  
  /** Taille maximale */
  maxSize?: number;
  
  /** Unité de mesure */
  unit?: string;
  
  /** Timestamp de reset (pour rate limiting) */
  resetAt?: string;
  
  /** Requêtes restantes */
  remaining?: number;
  
  /** Limite de requêtes */
  limit?: number;
  
  /** ID du service concerné */
  serviceId?: string;
  
  /** ID d'erreur interne */
  errorId?: string;
  
  /** Délai avant retry (en secondes) */
  retryAfter?: number;
  
  /** Fenêtre de maintenance */
  maintenanceWindow?: string;
  
  /** Propriétés additionnelles */
  [key: string]: any;
}

/**
 * Réponse d'erreur standardisée
 */
export interface ErrorResponse {
  /** Statut d'échec (toujours false) */
  success: false;
  
  /** Description de l'erreur */
  error: string;
  
  /** Code d'erreur machine-readable */
  code: ErrorCode;
  
  /** Détails additionnels spécifiques à l'erreur */
  details?: ErrorDetails;
  
  /** Timestamp de l'erreur (ISO 8601) */
  timestamp?: string;
  
  /** Identifiant de la requête pour traçabilité */
  requestId?: string;
}

/**
 * Union type pour toutes les réponses possibles
 */
export type EnterpriseExportApiResponse = EnterpriseExportResponse | ErrorResponse;

/**
 * Informations de rate limiting
 */
export interface RateLimitInfo {
  /** Nombre de requêtes autorisées */
  requests: number;
  
  /** Fenêtre temporelle */
  window: string;
  
  /** Nombre de requêtes en burst */
  burst: number;
}

/**
 * Configuration de sécurité enterprise
 */
export interface EnterpriseSecurityConfig {
  /** Type d'authentification requis */
  authType: 'Bearer' | 'ApiKey';
  
  /** Token Bearer JWT */
  bearerToken?: string;
  
  /** Clé API enterprise */
  apiKey?: string;
  
  /** Headers de sécurité additionnels */
  securityHeaders?: Record<string, string>;
}

/**
 * Validation de contenu enterprise
 */
export interface ContentValidationResult {
  /** Score enterprise (0-100) */
  score: number;
  
  /** Classification du contenu */
  classification: ContentClassification;
  
  /** Indique si le contenu est enterprise */
  isEnterprise: boolean;
  
  /** Raisons du score */
  reasons: string[];
  
  /** Suggestions d'amélioration */
  suggestions?: string[];
}

/**
 * Contraintes de performance
 */
export interface PerformanceConstraints {
  /** Nombre maximum de requêtes concurrentes */
  maxConcurrentRequests: number;
  
  /** Temps de traitement maximum (en secondes) */
  maxProcessingTime: number;
  
  /** Cache activé */
  cacheEnabled: boolean;
  
  /** TTL du cache (en secondes) */
  cacheTtl?: number;
}

/**
 * Configuration enterprise complète
 */
export interface EnterpriseConfig {
  /** Validation de contenu */
  contentValidation: {
    enabled: boolean;
    minimumScore: number;
    supportedTypes: ContentClassification[];
  };
  
  /** Sécurité */
  security: {
    encryption: string;
    dataRetention: string;
    auditLogging: boolean;
  };
  
  /** Performance */
  performance: PerformanceConstraints;
  
  /** Rate limiting */
  rateLimiting: RateLimitInfo;
}

/**
 * Hooks de validation personnalisés
 */
export interface ValidationHooks {
  /** Validation avant traitement */
  beforeValidation?: (request: EnterpriseExportRequest) => Promise<void>;
  
  /** Validation après analyse de contenu */
  afterContentAnalysis?: (request: EnterpriseExportRequest, result: ContentValidationResult) => Promise<void>;
  
  /** Validation avant génération */
  beforeGeneration?: (request: EnterpriseExportRequest) => Promise<void>;
  
  /** Validation après génération */
  afterGeneration?: (response: EnterpriseExportResponse) => Promise<void>;
}

/**
 * Context d'exécution pour les requêtes
 */
export interface ExecutionContext {
  /** ID de la requête */
  requestId: string;
  
  /** Timestamp de début */
  startTime: number;
  
  /** Utilisateur authentifié */
  user?: {
    id: string;
    permissions: string[];
    organization?: string;
  };
  
  /** Métadonnées de la requête */
  metadata: Record<string, any>;
  
  /** Configuration active */
  config: EnterpriseConfig;
}

/**
 * Type guard pour vérifier le succès de la réponse
 */
export function isSuccessResponse(response: EnterpriseExportApiResponse): response is EnterpriseExportResponse {
  return response.success === true;
}

/**
 * Type guard pour vérifier les erreurs
 */
export function isErrorResponse(response: EnterpriseExportApiResponse): response is ErrorResponse {
  return response.success === false;
}

/**
 * Validation des contraintes de contenu
 */
export function validateContentConstraints(content: string, template?: EnterpriseTemplate): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validation de longueur de base
  if (content.length < 50) {
    errors.push(`Content too short: ${content.length} characters (minimum: 50)`);
  }
  
  if (content.length > 1000000) {
    errors.push(`Content too long: ${content.length} characters (maximum: 1,000,000)`);
  }
  
  // Validation spécifique au template executive
  if (template === 'executive' && content.length < 200) {
    errors.push(`Executive template requires minimum 200 characters (received: ${content.length})`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validation des options d'export
 */
export function validateExportOptions(options: ExportOptions, format: ExportFormat): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // DOCX ne supporte pas les graphiques
  if (format === 'docx' && options.includeCharts) {
    errors.push('Charts are not supported in DOCX format');
  }
  
  // Validation du watermark
  if (options.watermark && options.watermark.length > 50) {
    errors.push(`Watermark too long: ${options.watermark.length} characters (maximum: 50)`);
  }
  
  // Warning pour haute résolution
  if (options.highResolution) {
    warnings.push('High resolution may significantly impact processing time');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Constantes de configuration
 */
export const ENTERPRISE_CONSTANTS = {
  /** Score minimum pour être considéré comme enterprise */
  MIN_ENTERPRISE_SCORE: 80,
  
  /** Longueur minimum du contenu */
  MIN_CONTENT_LENGTH: 50,
  
  /** Longueur maximum du contenu */
  MAX_CONTENT_LENGTH: 1000000,
  
  /** Longueur minimum pour template executive */
  MIN_EXECUTIVE_CONTENT_LENGTH: 200,
  
  /** Longueur maximum du watermark */
  MAX_WATERMARK_LENGTH: 50,
  
  /** Rétention par défaut des exports */
  DEFAULT_RETENTION_DAYS: 7,
  
  /** Rétention maximum des exports */
  MAX_RETENTION_DAYS: 30,
  
  /** Timeout de traitement par défaut */
  DEFAULT_PROCESSING_TIMEOUT: 30,
  
  /** Limite de requêtes concurrentes */
  MAX_CONCURRENT_REQUESTS: 5
} as const; 