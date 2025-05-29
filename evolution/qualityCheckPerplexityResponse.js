/**
 * Module de contrôle qualité des réponses Perplexity
 * Valide la pertinence sémantique des réponses en vérifiant la présence de mots-clés attendus
 */

/**
 * Vérifie la qualité d'une réponse Perplexity
 * @param {Object} response - La réponse à valider
 * @param {string[]} expectedKeywords - Liste des mots-clés attendus dans la réponse
 * @returns {boolean} true si la réponse est pertinente, false sinon
 */
export function qualityCheckPerplexityResponse(response, expectedKeywords = []) {
    if (!response || !response.content) return false;
    
    const content = response.content.toLowerCase();
    
    // Vérification des mots-clés attendus
    if (expectedKeywords.length > 0) {
        const hasKeywords = expectedKeywords.some(keyword => 
            content.includes(keyword.toLowerCase())
        );
        if (!hasKeywords) return false;
    }
    
    // Vérification de la longueur minimale
    if (content.length < 50) return false;
    
    // Vérification de la cohérence
    if (content.includes('undefined') || content.includes('null')) return false;
    
    return true;
} 