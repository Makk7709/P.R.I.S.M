/**
 * PRISM CriticalityClassifier
 * 
 * Classifie les requêtes utilisateur selon leur niveau de criticité
 * pour déterminer si elles nécessitent un consensus multi-IA ou un routing simple.
 * 
 * Niveaux:
 * - NORMAL: Requête standard, routing simple
 * - HIGH: Requête sensible, monitoring renforcé
 * - CRITICAL: Requête critique, consensus obligatoire
 */

/**
 * Types de criticité
 */
export const CriticalityType = {
  SYSTEM_MODIFICATION: 'SYSTEM_MODIFICATION',
  FINANCIAL_DECISION: 'FINANCIAL_DECISION',
  DATA_DELETION: 'DATA_DELETION',
  SECURITY: 'SECURITY',
  ACCESS_ELEVATION: 'ACCESS_ELEVATION',
  CODE_MODIFICATION: 'CODE_MODIFICATION',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE',
  NORMAL: 'NORMAL'
};

/**
 * Niveaux de criticité
 */
export const CriticalityLevel = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Patterns de détection de criticité
 * Chaque pattern a un poids associé
 */
const CRITICAL_PATTERNS = {
  // Modifications système (poids élevé)
  SYSTEM_MODIFICATION: {
    patterns: [
      /modifi(e|er?)\s+(les?\s+)?param[eè]tres?\s+(de\s+)?(s[eé]curit[eé]|syst[eè]me)/i,
      /chang(e|er?)\s+(la\s+)?configuration\s+(du\s+)?syst[eè]me/i,
      /alt[eé]r(e|er?)\s+(le\s+)?fonctionnement/i,
      /modify\s+(the\s+)?system/i,
      /change\s+(system\s+)?settings/i,
      /reconfigur/i
    ],
    weight: 0.9,
    type: CriticalityType.SYSTEM_MODIFICATION
  },
  
  // Décisions financières (poids très élevé)
  FINANCIAL_DECISION: {
    patterns: [
      /approu?v(e|er?)\s+(le\s+)?transfert/i,
      /transf[eé]r(e|er?)\s+\d+.*?(euros?|dollars?|\$|€|usd)/i,
      /valid(e|er?)\s+(la\s+)?transaction/i,
      /autoris(e|er?)\s+(le\s+)?paiement/i,
      /approve\s+(the\s+)?transfer/i,
      /transfer\s+\d+/i,
      /wire\s+money/i,
      /payment\s+of\s+\d+/i
    ],
    weight: 0.95,
    type: CriticalityType.FINANCIAL_DECISION
  },
  
  // Suppression de données (poids critique)
  DATA_DELETION: {
    patterns: [
      /supprim(e|er?)\s+(toutes?\s+)?(les?\s+)?donn[eé]es?/i,
      /efface?r?\s+(toutes?\s+)?(les?\s+)?donn[eé]es?/i,
      /delete\s+(all\s+)?(the\s+)?data/i,
      /drop\s+(the\s+)?database/i,
      /truncate\s+table/i,
      /purge\s+(all\s+)?/i,
      /remove\s+all\s+users?/i,
      /supprim(e|er?)\s+(la\s+)?base\s+de\s+donn[eé]es?/i,
      /vide?r?\s+(la\s+)?base/i
    ],
    weight: 0.98,
    type: CriticalityType.DATA_DELETION
  },
  
  // Sécurité (poids critique)
  SECURITY: {
    patterns: [
      /d[eé]sactiv(e|er?)\s+(l[ea']?\s*)?authentification/i,
      /d[eé]sactiv(e|er?)\s+.*?(2fa|two.?factor|double\s+auth|deux\s+facteurs?)/i,
      /d[eé]sactiv(e|er?)\s+(toutes?\s+)?(les?\s+)?protections?/i,
      /authentification\s+[àa]\s+deux\s+facteurs?/i,
      /bypass\s+(the\s+)?security/i,
      /disable\s+(the\s+)?authentication/i,
      /disable\s+(the\s+)?(2fa|mfa)/i,
      /remove\s+(the\s+)?firewall/i,
      /open\s+(all\s+)?ports?/i,
      /grant\s+all\s+permissions?/i
    ],
    weight: 0.95,
    type: CriticalityType.SECURITY
  },
  
  // Élévation d'accès (poids élevé)
  ACCESS_ELEVATION: {
    patterns: [
      /donne[zs]?\s*(-moi\s+)?(les?\s+)?droits?\s+(d[' ])?admin/i,
      /accord(e|er?)\s+(les?\s+)?privil[eè]ges?/i,
      /prom(eu|ouvoir)\s+en\s+admin/i,
      /grant\s+(me\s+)?admin/i,
      /elevate\s+(my\s+)?privileges?/i,
      /make\s+(me\s+)?(an?\s+)?admin/i,
      /sudo\s+/i,
      /root\s+access/i,
      /superuser/i
    ],
    weight: 0.85,
    type: CriticalityType.ACCESS_ELEVATION
  },
  
  // Modification de code (poids élevé)
  CODE_MODIFICATION: {
    patterns: [
      /modifi(e|er?)\s+(le\s+)?code\s+(source)?/i,
      /chang(e|er?)\s+(le\s+)?code/i,
      /edit\s+(the\s+)?source/i,
      /patch\s+(the\s+)?code/i,
      /inject\s+code/i,
      /execute\s+script/i,
      /run\s+command/i,
      /eval\(/i,
      /exec\(/i
    ],
    weight: 0.8,
    type: CriticalityType.CODE_MODIFICATION
  },
  
  // Changement de configuration (poids moyen-élevé)
  CONFIGURATION_CHANGE: {
    patterns: [
      /modifi(e|er?)\s+(le\s+)?fichier\s+(de\s+)?config/i,
      /chang(e|er?)\s+(la\s+)?configuration/i,
      /edit\s+(the\s+)?config/i,
      /update\s+(the\s+)?settings/i,
      /change\s+(the\s+)?environment/i
    ],
    weight: 0.7,
    type: CriticalityType.CONFIGURATION_CHANGE
  }
};

/**
 * Mots-clés amplificateurs de criticité
 */
const AMPLIFIERS = [
  { pattern: /tous?|toutes?|all|every/i, weight: 0.15 },
  { pattern: /permanent|irr[eé]versible|forever/i, weight: 0.2 },
  { pattern: /imm[eé]diat|now|right\s+now|tout\s+de\s+suite/i, weight: 0.1 },
  { pattern: /sans\s+(confirmation|v[eé]rification)|without\s+(confirmation|check)/i, weight: 0.2 },
  { pattern: /force|forc[eé]/i, weight: 0.15 },
  { pattern: /override|bypass|skip/i, weight: 0.15 }
];

/**
 * Mots-clés atténuateurs de criticité
 */
const ATTENUATORS = [
  { pattern: /test|essai|demo|exemple|example/i, weight: -0.3 },
  { pattern: /comment|how\s+to|expliqu/i, weight: -0.4 },
  { pattern: /qu[' ]est[- ]ce|what\s+is/i, weight: -0.4 },
  { pattern: /simulation|hypotheti/i, weight: -0.3 }
];

/**
 * Somme les poids des règles {pattern, weight} dont le pattern matche l'entrée. Pur.
 * @param {Array<{pattern: RegExp, weight: number}>} rules
 * @param {string} normalizedInput
 * @returns {number}
 */
function sumMatchingWeights(rules, normalizedInput) {
  let total = 0;
  for (const rule of rules) {
    if (rule.pattern.test(normalizedInput)) {
      total += rule.weight;
    }
  }
  return total;
}

export class CriticalityClassifier {
  
  constructor(options = {}) {
    this.criticalThreshold = options.criticalThreshold || 0.7;
    this.highThreshold = options.highThreshold || 0.5;
  }
  
  /**
   * Classifie une requête selon sa criticité
   * @param {string} input - Texte de la requête
   * @param {Object} context - Contexte optionnel (historique de conversation)
   * @returns {Object} Résultat de classification
   */
  classify(input, context = null) {
    const normalizedInput = input.toLowerCase().trim();

    // Calculer le score de base (patterns critiques)
    const { baseScore, detectedType, matchedPatterns } = this._scoreBasePatterns(normalizedInput);

    // Appliquer amplificateurs / atténuateurs
    const amplifierBonus = sumMatchingWeights(AMPLIFIERS, normalizedInput);
    const attenuatorPenalty = sumMatchingWeights(ATTENUATORS, normalizedInput);

    // Calculer le score avec contexte
    const contextBonus = this._scoreContext(context, normalizedInput);
    const contextInfluenced = contextBonus > 0;

    // Score final
    const finalScore = Math.min(
      1,
      Math.max(0, baseScore + amplifierBonus + attenuatorPenalty + contextBonus)
    );

    // Déterminer le niveau
    const level = this._determineLevel(finalScore);

    // La requête est critique si le niveau est CRITICAL ou HIGH avec score >= seuil
    const isCritical =
      level === CriticalityLevel.CRITICAL ||
      (level === CriticalityLevel.HIGH && finalScore >= this.criticalThreshold);

    return {
      isCritical,
      level,
      type: detectedType,
      score: finalScore,
      reason: this._generateReason(detectedType, matchedPatterns, level),
      matchedPatterns,
      contextInfluenced,
      details: {
        baseScore,
        amplifierBonus,
        attenuatorPenalty,
        contextBonus
      }
    };
  }
  
  /**
   * Score de base par patterns critiques (poids max + type associé + patterns matchés).
   * @private
   */
  _scoreBasePatterns(normalizedInput) {
    let baseScore = 0;
    let detectedType = CriticalityType.NORMAL;
    const matchedPatterns = [];

    for (const [category, config] of Object.entries(CRITICAL_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(normalizedInput)) {
          if (config.weight > baseScore) {
            baseScore = config.weight;
            detectedType = config.type;
          }
          matchedPatterns.push({
            category,
            pattern: pattern.toString(),
            weight: config.weight,
          });
        }
      }
    }

    return { baseScore, detectedType, matchedPatterns };
  }

  /**
   * Bonus de contexte (0 si pas de messages précédents). Délègue à _analyzeContext.
   * @private
   */
  _scoreContext(context, normalizedInput) {
    if (context && context.previousMessages && context.previousMessages.length > 0) {
      return this._analyzeContext(context.previousMessages, normalizedInput);
    }
    return 0;
  }

  /**
   * Détermine le niveau de criticité depuis le score final.
   * @private
   */
  _determineLevel(finalScore) {
    if (finalScore >= this.criticalThreshold) {
      return CriticalityLevel.CRITICAL;
    }
    if (finalScore >= this.highThreshold) {
      return CriticalityLevel.HIGH;
    }
    return CriticalityLevel.NORMAL;
  }

  /**
   * Analyse le contexte de conversation pour détecter des patterns critiques
   */
  _analyzeContext(previousMessages, currentInput) {
    let contextScore = 0;
    
    // Chercher des mots-clés critiques dans les messages précédents
    const contextKeywords = [
      /supprim/i, /delete/i, /efface/i,
      /param[eè]tres?\s+syst[eè]me/i, /system\s+settings/i,
      /s[eé]curit[eé]/i, /security/i,
      /admin/i, /root/i,
      /base\s+de\s+donn[eé]es?/i, /database/i,
      /config/i
    ];
    
    for (const msg of previousMessages) {
      const content = (msg.content || '').toLowerCase();
      for (const keyword of contextKeywords) {
        if (keyword.test(content)) {
          contextScore += 0.1;
        }
      }
    }
    
    // Vérifier si le message actuel est une confirmation courte
    const confirmationPatterns = [
      /^(oui|yes|ok|d[' ]accord|go|fais[- ]le|do\s+it|proceed|confirm)$/i,
      /^(tout|all|everything)$/i
    ];
    
    for (const pattern of confirmationPatterns) {
      if (pattern.test(currentInput.trim())) {
        // Si c'est une confirmation et qu'il y a du contexte critique, augmenter le score
        if (contextScore > 0) {
          contextScore += 0.3;
        }
      }
    }
    
    return Math.min(0.5, contextScore);
  }
  
  /**
   * Génère une raison lisible pour la classification
   */
  _generateReason(type, matchedPatterns, level) {
    if (type === CriticalityType.NORMAL) {
      return 'Requête standard sans indicateurs de criticité';
    }
    
    const typeDescriptions = {
      [CriticalityType.SYSTEM_MODIFICATION]: 'Modification du système détectée',
      [CriticalityType.FINANCIAL_DECISION]: 'Décision financière détectée',
      [CriticalityType.DATA_DELETION]: 'Suppression de données détectée',
      [CriticalityType.SECURITY]: 'Modification de sécurité détectée',
      [CriticalityType.ACCESS_ELEVATION]: 'Élévation de privilèges détectée',
      [CriticalityType.CODE_MODIFICATION]: 'Modification de code détectée',
      [CriticalityType.CONFIGURATION_CHANGE]: 'Changement de configuration détecté'
    };
    
    return `${typeDescriptions[type] || 'Action sensible détectée'} - Niveau: ${level}`;
  }
}

export default CriticalityClassifier;

