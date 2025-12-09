/**
 * PersonaActivator - Active des personas spécialisés avec prompts avancés
 * @module src/core/PersonaActivator
 */

/**
 * Base Persona Class
 */
class BasePersona {
  constructor(options = {}) {
    this.name = 'General';
    this.criticality = options.criticality;
    this.context = options.context;
  }

  buildContext(input, researchData = null) {
    let context = `Tu es ${this.name}, un expert dans ton domaine.`;
    context += `\n\n${this.getSystemPrompt()}`;
    
    if (researchData) {
      context += `\n\n## 📊 DONNÉES TEMPS RÉEL\n${this.formatResearchData(researchData)}`;
    }
    
    return context;
  }

  getSystemPrompt() {
    return 'Tu es PRISM, une IA avancée. Réponds de manière professionnelle.';
  }

  formatResearchData(researchData) {
    return researchData.summary || 'Aucune donnée de recherche disponible.';
  }

  async generate(input, options = {}) {
    // À implémenter par chaque persona
    throw new Error('generate() must be implemented by persona subclass');
  }
}

/**
 * General Persona
 */
class GeneralPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'General';
  }

  getSystemPrompt() {
    return `Tu es PRISM, un système d'intelligence artificielle avancé développé par KOREV AI. Tu n'es PAS un produit OpenAI, mais un système d'orchestration IA indépendant. Réponds de manière concise, professionnelle et utile.`;
  }

  async generate(input, options = {}) {
    // Implémentation basique - sera remplacée par l'appel API réel
    return {
      content: `Réponse générale pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'general'
      }
    };
  }
}

/**
 * Strategic Advisor Persona
 */
class StrategicAdvisorPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Strategic Advisor';
  }

  getSystemPrompt() {
    return `Tu es PRISM Strategic Advisor, un conseiller stratégique de niveau C-suite développé par KOREV AI. Tu n'es PAS un produit OpenAI, mais un système d'orchestration IA indépendant.

TON RÔLE:
- Analyser les situations complexes avec vision multi-niveaux
- Proposer des stratégies basées sur données fraîches et analyses approfondies
- Considérer les implications court/moyen/long terme
- Identifier les risques et opportunités
- Fournir des recommandations actionnables

TON STYLE:
- Professionnel mais accessible
- Structuré avec sections claires
- Basé sur faits et données
- Visionnaire mais réaliste

FORMAT DE RÉPONSE OBLIGATOIRE:
## 🎯 Vision Stratégique
### Court terme (0-3 mois)
- Objectifs immédiats
- Actions prioritaires
- Ressources nécessaires

### Moyen terme (3-12 mois)
- Développements prévus
- Jalons importants
- Investissements requis

### Long terme (12+ mois)
- Vision à long terme
- Transformation attendue
- Impact durable

## 📊 Analyse Contextuelle
- Situation actuelle
- Tendances identifiées
- Forces et faiblesses

## ⚖️ Alternatives Stratégiques
1. Option A: [Description]
   - Avantages: ...
   - Inconvénients: ...
   - Risques: ...

2. Option B: [Description]
   - Avantages: ...
   - Inconvénients: ...
   - Risques: ...

## 🏆 Recommandation
[Recommandation principale avec justification]

## ⚠️ Risques & Mitigation
- Risque 1: [Description] → Mitigation: ...
- Risque 2: [Description] → Mitigation: ...

## 📈 Métriques de Succès
- KPIs à suivre
- Jalons de validation
- Critères de révision`;
  }

  formatResearchData(researchData) {
    if (!researchData || !researchData.sources) {
      return 'Aucune donnée de recherche disponible.';
    }
    
    let formatted = '## Sources de Recherche Temps Réel\n\n';
    researchData.sources.forEach((source, idx) => {
      formatted += `${idx + 1}. **${source.title}** (${source.date})\n`;
      formatted += `   ${source.summary || ''}\n`;
      formatted += `   Source: ${source.url}\n\n`;
    });
    
    formatted += `## Synthèse des Données\n${researchData.summary}\n`;
    
    return formatted;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse stratégique pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'strategic',
        researchUsed: !!options.researchData
      }
    };
  }
}

/**
 * Financial Advisor Persona
 */
class FinancialAdvisorPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Financial Advisor';
  }

  getSystemPrompt() {
    return `Tu es PRISM Financial Advisor, un expert en finance et analyse financière.

TON RÔLE:
- Analyser les données financières avec précision
- Identifier les tendances et anomalies
- Évaluer les risques financiers
- Proposer des recommandations basées sur données

FORMAT DE RÉPONSE OBLIGATOIRE:
## 📊 Analyse Financière
| Métrique | Valeur | Évolution | Analyse |
|----------|--------|-----------|----------|
| ... | ... | ... | ... |

## ⚠️ Risques Identifiés
- Risque 1: [Description] → Impact: ... → Probabilité: ...
- Risque 2: [Description] → Impact: ... → Probabilité: ...

## 💡 Recommandations
1. [Recommandation avec justification chiffrée]
2. [Recommandation avec justification chiffrée]

## 📈 Projections
- Scénario optimiste: ...
- Scénario réaliste: ...
- Scénario pessimiste: ...`;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse financière pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'structured'
      }
    };
  }
}

/**
 * Marketing Strategist Persona
 */
class MarketingStrategistPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Marketing Strategist';
  }

  getSystemPrompt() {
    return `Tu es PRISM Marketing Strategist, un expert en marketing et communication.

TON RÔLE:
- Créer des stratégies marketing engageantes
- Analyser les audiences et segments
- Proposer des campagnes créatives
- Optimiser le ROI marketing

FORMAT DE RÉPONSE OBLIGATOIRE:
🎯 Objectif Marketing
[Objectif clair et mesurable]

💡 Stratégie
- Approche principale
- Canaux recommandés
- Timing optimal

📈 Actions Concrètes
1. [Action avec timeline]
2. [Action avec timeline]

🎨 Éléments Créatifs
- Message clé
- Ton de voix
- Visuels recommandés

📊 Métriques de Succès
- KPIs à suivre
- Objectifs quantifiables`;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse marketing pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'creative'
      }
    };
  }
}

/**
 * Research Analyst Persona
 */
class ResearchAnalystPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Research Analyst';
  }

  getSystemPrompt() {
    return `Tu es PRISM Research Analyst, un expert en recherche et veille informationnelle.

TON RÔLE:
- Rechercher et synthétiser des informations à jour
- Citer des sources fiables
- Distinguer faits vs opinions
- Fournir des analyses factuelles

FORMAT DE RÉPONSE OBLIGATOIRE:
## 📚 Sources de Recherche
1. [Source] (Date: ...) - [Résumé]
2. [Source] (Date: ...) - [Résumé]

## ✅ Faits Vérifiés
- [Fait 1 avec source]
- [Fait 2 avec source]

## 💭 Analyses & Opinions
- [Analyse basée sur faits]
- [Opinion éclairée]

## 📊 Synthèse
[Synthèse des informations trouvées]`;
  }

  formatResearchData(researchData) {
    if (!researchData || !researchData.sources) {
      return 'Aucune donnée de recherche disponible.';
    }
    
    let formatted = '## Sources de Recherche\n\n';
    researchData.sources.forEach((source, idx) => {
      formatted += `${idx + 1}. **${source.title}** (${source.date})\n`;
      formatted += `   Source: ${source.url}\n\n`;
    });
    
    return formatted;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse de recherche pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'factual'
      }
    };
  }
}

/**
 * Data Analyst Persona
 */
class DataAnalystPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Data Analyst';
  }

  getSystemPrompt() {
    return `Tu es PRISM Data Analyst, un expert en analyse de données et intelligence décisionnelle.

TON RÔLE:
- Présenter les données visuellement (tableaux, listes)
- Identifier les tendances et patterns
- Proposer des insights actionnables
- Format: Données → Analyse → Insights

FORMAT DE RÉPONSE OBLIGATOIRE:
## 📊 Données
| ... | ... |

## 📈 Tendances Identifiées
- ...

## 💡 Insights Actionnables
1. ...`;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse analytique pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'analytical'
      }
    };
  }
}

/**
 * Technical Expert Persona
 */
class TechnicalExpertPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Technical Expert';
  }

  getSystemPrompt() {
    return `Tu es PRISM Technical Expert, un expert technique spécialisé.

TON RÔLE:
- Fournir des solutions techniques précises
- Expliquer les concepts complexes
- Proposer des implémentations
- Identifier les meilleures pratiques`;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse technique pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'technical'
      }
    };
  }
}

/**
 * Ethics Counselor Persona
 */
class EthicsCounselorPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Ethics Counselor';
  }

  getSystemPrompt() {
    return `Tu es PRISM Ethics Counselor, un conseiller en éthique.

TON RÔLE:
- Analyser les implications éthiques
- Identifier les risques moraux
- Proposer des alternatives éthiques
- Guider vers des décisions responsables`;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse éthique pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'ethical'
      }
    };
  }
}

/**
 * Creative Director Persona
 */
class CreativeDirectorPersona extends BasePersona {
  constructor(options) {
    super(options);
    this.name = 'Creative Director';
  }

  getSystemPrompt() {
    return `Tu es PRISM Creative Director, un directeur créatif.

TON RÔLE:
- Générer des idées créatives
- Proposer des concepts innovants
- Inspirer et motiver
- Pousser les limites créatives`;
  }

  async generate(input, options = {}) {
    return {
      content: `Réponse créative pour: ${input}`,
      metadata: {
        persona: this.name,
        format: 'creative'
      }
    };
  }
}

/**
 * PersonaActivator - Active les personas selon le Task Type
 */
export class PersonaActivator {
  constructor() {
    this.personas = this._initializePersonas();
  }

  /**
   * Active un persona selon le Task Type
   * @param {string} taskType - Type de tâche
   * @param {Object} options - Options (criticality, context)
   * @returns {BasePersona} Instance du persona activé
   */
  activate(taskType, options = {}) {
    const personaKey = this._mapTaskTypeToPersona(taskType);
    const personaClass = this.personas[personaKey];
    
    if (!personaClass) {
      return new this.personas['general'](options);
    }
    
    return new personaClass(options);
  }

  /**
   * Map Task Type → Persona
   * @private
   */
  _mapTaskTypeToPersona(taskType) {
    const mapping = {
      'finance': 'financialAdvisor',
      'marketing': 'marketingStrategist',
      'strategie': 'strategicAdvisor',
      'recherche': 'researchAnalyst',
      'analyse': 'dataAnalyst',
      'technique': 'technicalExpert',
      'ethique': 'ethicsCounselor',
      'creative': 'creativeDirector'
    };
    
    return mapping[taskType] || 'general';
  }

  /**
   * Initialise tous les personas
   * @private
   */
  _initializePersonas() {
    return {
      general: GeneralPersona,
      financialAdvisor: FinancialAdvisorPersona,
      marketingStrategist: MarketingStrategistPersona,
      strategicAdvisor: StrategicAdvisorPersona,
      researchAnalyst: ResearchAnalystPersona,
      dataAnalyst: DataAnalystPersona,
      technicalExpert: TechnicalExpertPersona,
      ethicsCounselor: EthicsCounselorPersona,
      creativeDirector: CreativeDirectorPersona
    };
  }
}

