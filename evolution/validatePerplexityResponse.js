/**
 * Module de validation des réponses Perplexity
 * Vérifie la validité métier minimale des réponses avant traitement
 */

/**
 * Liste des patterns interdits dans les réponses
 * @type {string[]}
 */
const FORBIDDEN_PATTERNS = [
    'error',
    'forbidden',
    'bad request',
    'unauthorized',
    'invalid',
    'failed',
    'not found'
];

/**
 * Valide une réponse Perplexity
 * @param {Object} response - La réponse à valider
 * @returns {boolean} - true si la réponse est valide, false sinon
 */
export function validatePerplexityResponse(response) {
    if (!response) return false;
    if (typeof response !== 'object') return false;
    if (!response.content) return false;
    if (typeof response.content !== 'string') return false;
    return true;
} 