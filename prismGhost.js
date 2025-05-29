// PRISM Ghost Mode - Offline Dialogue Simulator
const GHOST_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

const GHOST_RESPONSES = {
  [GHOST_STATES.IDLE]: [
    "Je suis prêt à discuter.",
    "Comment puis-je vous aider aujourd'hui ?",
    "Je vous écoute.",
    "Que souhaitez-vous explorer ?"
  ],
  [GHOST_STATES.LOADING]: [
    "Je réfléchis à votre demande...",
    "Analyse en cours...",
    "Un instant, je traite l'information...",
    "Je consulte mes données..."
  ],
  [GHOST_STATES.SUCCESS]: [
    "J'ai trouvé une réponse pertinente.",
    "Voici ce que je peux vous dire à ce sujet.",
    "D'après mes analyses...",
    "Je peux vous proposer..."
  ],
  [GHOST_STATES.ERROR]: [
    "Je n'ai pas pu traiter cette demande.",
    "Une erreur s'est produite.",
    "Je ne peux pas répondre pour le moment.",
    "Cette requête dépasse mes capacités actuelles."
  ]
};

const CONTEXT_KEYWORDS = {
  technical: ['code', 'programme', 'développement', 'technique'],
  general: ['quoi', 'comment', 'pourquoi', 'explique'],
  action: ['fais', 'crée', 'montre', 'trouve']
};

export class PrismGhost {
  constructor() {
    this.memory = [];
    this.maxMemorySize = 5;
  }

  updateMemory(context) {
    this.memory.unshift(context);
    if (this.memory.length > this.maxMemorySize) {
      this.memory.pop();
    }
  }

  getContextualResponse(state, context) {
    const baseResponses = GHOST_RESPONSES[state];
    if (!baseResponses) return "État non reconnu.";

    let response = baseResponses[Math.floor(Math.random() * baseResponses.length)];
    
    if (context && this.memory.length > 0) {
      const recentContext = this.memory[0];
      if (recentContext) {
        response += ` ${this.generateContextualAddition(recentContext)}`;
      }
    }

    return response;
  }

  generateContextualAddition(context) {
    const keywords = Object.entries(CONTEXT_KEYWORDS).find(([_, words]) => 
      words.some(word => context.toLowerCase().includes(word))
    );

    if (keywords) {
      const [category] = keywords;
      switch (category) {
        case 'technical':
          return "Je peux vous aider avec des aspects techniques.";
        case 'general':
          return "Laissez-moi approfondir ce sujet.";
        case 'action':
          return "Je vais vous guider dans cette action.";
        default:
          return "";
      }
    }
    return "";
  }
}

export function generateGhostReply(state, context) {
  const ghost = new PrismGhost();
  ghost.updateMemory(context);
  return ghost.getContextualResponse(state, context);
} 