import * as THREE from 'three';
import { config } from './config.js';
import { ParticleSystem } from './particles.js';
import { AudioManager } from './audio.js';
import { initializeUI } from './prismUI.js';
import { initializeAudio } from './audio.js';
import PrismAuroraConsciousness from './monitoring/prismAuroraConsciousness.js';
import PrismElysiumMode from './regulation/prismElysiumMode.js';
import PrismCodex from './memory/prismCodex.js';
import { generateDirectives, hydrate as hydrateStrategicLayer } from './prismStrategicLayer.js';
import PrismStateStore from './persistence/prismStateStore.js';

// Autres imports...

// Utiliser config.modes au lieu de CONFIG.MODES
const mode = process.env.PRISM_MODE || config.modes.TEST;

/**
 * Initializes the PRISM application with all its components
 * @returns {Promise<void>}
 */
export async function initializePRISM() {
  console.log(`🚀 Initializing PRISM in ${mode} mode...`);
  
  // Vérifier le mode
  if (mode !== config.modes.TEST && mode !== config.modes.PROD) {
    throw new Error(`Invalid PRISM mode: ${mode}`);
  }
  
  const elements = {
    btnPrism: document.getElementById('btn-prism'),
    transcript: document.getElementById('transcript'),
    errorMessage: document.getElementById('error-message'),
    statusMessage: document.getElementById('status-message'),
    particleContainer: document.getElementById('particle-container')
  };

  // Validate required DOM elements
  Object.entries(elements).forEach(([key, element]) => {
    if (!element) throw new Error(`Required element #${key} not found`);
  });

  const showStatus = (message, duration = config.UI.STATUS_DURATION) => {
    console.log('Status:', message);
    elements.statusMessage.textContent = message;
    elements.statusMessage.classList.add('visible');
    setTimeout(() => elements.statusMessage.classList.remove('visible'), duration);
  };

  const showError = (message) => {
    console.error('Error:', message);
    elements.errorMessage.textContent = message;
    elements.btnPrism.textContent = 'P.R.I.S.M';
    elements.btnPrism.disabled = false;
    showStatus(message, config.UI.ERROR_DURATION);
  };

  const setupScene = () => {
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 12;
      
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance'
      });
      
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      elements.particleContainer.appendChild(renderer.domElement);
      
      return { scene, camera, renderer };
    } catch (error) {
      throw new Error(`Scene setup failed: ${error.message}`);
    }
  };

  try {
    showStatus(config.MESSAGES.LOADING.INIT);
    
    // Initialize state store
    const stateStore = new PrismStateStore();
    
    // Restore Strategic Layer state
    const strategicLayerState = await stateStore.loadState('StrategicLayer');
    if (strategicLayerState) {
      await hydrateStrategicLayer(strategicLayerState);
      showStatus('État stratégique restauré');
    }
    
    // Initialize UI system
    const ui = initializeUI();
    
    // Initialize Three.js scene first
    const { scene, camera, renderer } = setupScene();
    
    // Initialize particle system
    const particleSystem = new ParticleSystem(scene);
    particleSystem.setRenderer(renderer);
    particleSystem.setCamera(camera);
    particleSystem.init();
    
    // Initialize audio
    const audio = await initializeAudio();
    
    // Initialize audio manager
    const audioManager = new AudioManager(
      (speaking) => {
        particleSystem.setSpeaking(speaking);
        if (!speaking) {
          elements.transcript.textContent = '';
          showStatus(config.MESSAGES.STATUS.WAITING);
        } else {
          showStatus(config.MESSAGES.STATUS.SPEAKING);
        }
      },
      ({ text, isFinal }) => {
        if (isFinal) {
          elements.transcript.textContent = text;
          audioManager.sendToWebhook(text)
            .then(() => showStatus(config.MESSAGES.STATUS.SENT))
            .catch(error => showError(error.message));
        }
      }
    );

    // Initialize Aurora Consciousness
    const auroraConsciousness = new PrismAuroraConsciousness();
    await auroraConsciousness.initialize();

    // Initialize Elysium Mode System
    const elysiumMode = new PrismElysiumMode();
    showStatus('Système de modes comportementaux initialisé');

    // Initialize PRISM Codex
    await PrismCodex.initialize();
    showStatus('Mémoire comportementale initialisée');

    // Setup event listeners
    window.addEventListener('resize', () => {
      particleSystem.resize(camera, renderer);
    });

    // Setup theme change listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });

    // Setup button click handler
    if (elements.btnPrism) {
      elements.btnPrism.addEventListener('click', async () => {
        try {
          ui.updateButtonState(false);
          ui.updateStatusMessage('Initialisation de la conversation...');
          
          await audio.start();
          
          ui.updateButtonState(true);
          ui.updateStatusMessage('Prêt à converser');
        } catch (error) {
          console.error('Error starting conversation:', error);
          ui.showError('Erreur lors de l\'initialisation de la conversation');
          ui.updateButtonState(true);
        }
      });
    }

    // Initialize theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    showStatus(config.MESSAGES.LOADING.READY);
    return {
      mode,
      config: config,
      ui,
      audio,
      auroraConsciousness,
      elysiumMode
    };
  } catch (error) {
    showError(error.message);
    return null;
  }
} 