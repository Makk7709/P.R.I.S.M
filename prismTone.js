// PRISM Emotional Engine
const TONE_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

const TONE_CONFIG = {
  [TONE_STATES.IDLE]: {
    colors: {
      primary: 'text-primary',
      accent: 'text-accent',
      bg: 'bg-bg'
    },
    animation: 'animate-pulse',
    message: 'En attente...',
    intonation: 'neutral'
  },
  [TONE_STATES.LOADING]: {
    colors: {
      primary: 'text-accent',
      accent: 'text-primary',
      bg: 'bg-bg'
    },
    animation: 'animate-spin',
    message: 'Analyse en cours...',
    intonation: 'rising'
  },
  [TONE_STATES.SUCCESS]: {
    colors: {
      primary: 'text-green-500',
      accent: 'text-green-300',
      bg: 'bg-green-900/20'
    },
    animation: 'animate-bounce',
    message: 'Opération réussie',
    intonation: 'falling'
  },
  [TONE_STATES.ERROR]: {
    colors: {
      primary: 'text-red-500',
      accent: 'text-red-300',
      bg: 'bg-red-900/20'
    },
    animation: 'animate-shake',
    message: 'Une erreur est survenue',
    intonation: 'flat'
  }
};

export const getTone = (state) => {
  return TONE_CONFIG[state] || TONE_CONFIG[TONE_STATES.IDLE];
};

export const applyToneToUI = (state) => {
  const tone = getTone(state);
  const elements = {
    container: document.getElementById('particle-container'),
    status: document.getElementById('status-message'),
    transcript: document.getElementById('transcript'),
    button: document.getElementById('btn-prism')
  };

  // Apply colors
  if (elements.status) {
    elements.status.className = `status-message ${tone.colors.primary} ${tone.animation}`;
    elements.status.textContent = tone.message;
  }

  if (elements.transcript) {
    elements.transcript.className = `text-xl ${tone.colors.primary} mb-6 min-h-[2rem]`;
  }

  if (elements.button) {
    elements.button.className = `btn-prism ${tone.colors.accent} ${tone.animation}`;
  }

  if (elements.container) {
    elements.container.className = `particle-container ${tone.colors.bg}`;
  }

  // Store current intonation for future voice synthesis
  window.currentIntonation = tone.intonation;
};

// Custom animations
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .animate-shake {
    animation: shake 0.5s ease-in-out infinite;
  }
`;
document.head.appendChild(style);

// Initialize with idle state
document.addEventListener('DOMContentLoaded', () => {
  applyToneToUI(TONE_STATES.IDLE);
}); 