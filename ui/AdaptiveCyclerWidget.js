/**
 * @fileoverview Widget de monitoring temps réel pour l'Adaptive Cycler
 * @module ui/AdaptiveCyclerWidget
 */

import { CONFIG } from '../config.js';
import { PrismCompression } from '../utils/prismCompression.js';
import { PrismPurgeScheduler } from '../utils/prismPurgeScheduler.js';
import { PrismHMAC } from '../security/prismHMAC.js';
import { AudioManager } from '../audio.js';
// import './prismUI.css';
// import './AdaptiveCyclerWidget.css';

export class AdaptiveCyclerWidget {
  constructor(audioManager) {
    this.container = null;
    this.intervalElement = null;
    this.efficiencyElement = null;
    this.directiveElement = null;
    this.efficiencyBar = null;
    this.lastRAF = 0;
    this.rafThrottle = 1000 / 30; // 30 FPS max
    this.compactMode = false;
    this.compression = new PrismCompression();
    this.purgeScheduler = new PrismPurgeScheduler();
    this.performanceMetrics = {
      cpu: 0,
      memory: 0,
      fps: 0,
      lastUpdate: 0
    };
    this.alertThresholds = {
      cpu: 80,
      memory: 85,
      fps: 30,
      efficiency: 50
    };
    this.alertHistory = [];
    this.isPlaying = false;
    this.audioManager = audioManager;
    this.voiceSettingsModal = null;
    this.voiceSettings = {
      voiceId: CONFIG.ELEVENLABS.VOICE_ID,
      speakingRate: CONFIG.ELEVENLABS.SPEAKING_RATE
    };
    this.ready = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      this.createContainer();
      this.setupEventListeners();
      this.setupPerformanceMonitoring();
      this.setupPurgeStrategies();
      this.ready = true;
      console.log("[INIT] AdaptiveCyclerWidget ready");
      return true;
    } catch (error) {
      console.error('Failed to initialize AdaptiveCyclerWidget:', error);
      this.ready = false;
      return false;
    }
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'prism-widget adaptive-cycler-widget fixed bottom-5 right-5 w-56 z-50';
    this.container.style.display = 'none';

    // Create internal elements
    this.intervalElement = document.createElement('div');
    this.intervalElement.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg';
    this.intervalElement.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Intervalle</div>
      <div class="value flex items-center gap-2">
        <span class="icon">⏱️</span>
        <span class="interval-value">0.0s</span>
      </div>
    `;

    this.efficiencyElement = document.createElement('div');
    this.efficiencyElement.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg mt-2';
    this.efficiencyElement.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Efficacité</div>
      <div class="value flex items-center gap-2">
        <span class="icon">📊</span>
        <span class="efficiency-value">0%</span>
      </div>
      <div class="efficiency-bar h-2 bg-gray-700 rounded-full mt-2">
        <div class="efficiency-bar-fill h-full rounded-full transition-all duration-300"></div>
      </div>
    `;

    this.directiveElement = document.createElement('div');
    this.directiveElement.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg mt-2';
    this.directiveElement.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Directive</div>
      <div class="value flex items-center gap-2">
        <span class="icon">🎯</span>
        <span class="directive-value">-</span>
      </div>
      <button class="audio-button bg-black/90 text-green-400 p-2 rounded-lg shadow-lg mt-2 w-full flex items-center justify-center gap-2 transition-all duration-300 hover:bg-green-400 hover:text-black" aria-label="Lire la directive">
        <span class="icon">🔊</span>
        <span class="audio-text">Lire</span>
      </button>
    `;

    // Add audio button event listener
    const audioButton = this.directiveElement.querySelector('.audio-button');
    audioButton.addEventListener('click', () => this.toggleAudio());
    audioButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleAudio();
      }
    });

    // Add voice settings button
    this.voiceSettingsButton = document.createElement('button');
    this.voiceSettingsButton.className = 'voice-settings-button bg-black/90 text-green-400 p-2 rounded-lg shadow-lg mt-2 w-full flex items-center justify-center gap-2 transition-all duration-300 hover:bg-green-400 hover:text-black';
    this.voiceSettingsButton.innerHTML = `
      <span class="icon">⚙️</span>
      <span class="voice-settings-text">Paramètres Voix</span>
    `;
    this.voiceSettingsButton.setAttribute('aria-label', 'Paramètres de la voix');
    this.voiceSettingsButton.setAttribute('role', 'button');
    this.voiceSettingsButton.setAttribute('tabindex', '0');

    // Create voice settings modal
    this.voiceSettingsModal = document.createElement('div');
    this.voiceSettingsModal.className = 'voice-settings-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden';
    this.voiceSettingsModal.innerHTML = `
      <div class="bg-black/90 text-green-400 p-6 rounded-lg shadow-lg w-80">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold">Paramètres de la Voix</h3>
          <button class="close-modal text-green-400 hover:text-white transition-colors">
            <span class="icon">✕</span>
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2">Voix</label>
            <select class="voice-select w-full bg-black/50 text-green-400 border border-green-400 rounded p-2">
              <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
              <option value="AZnzlk1XvdvUeBnXmlld">Domi</option>
              <option value="EXAVITQu4vr4xnSDxMaL">Bella</option>
              <option value="ErXwobaYiN019PkySvjV">Antoni</option>
              <option value="MF3mGyEYCl7XYWbV9V6O">Elli</option>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-2">Vitesse de lecture</label>
            <input type="range" class="speaking-rate w-full" min="0.8" max="1.2" step="0.1" value="1.0">
            <div class="text-sm text-center mt-1">
              <span class="speaking-rate-value">1.0x</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Assemble elements
    this.container.appendChild(this.intervalElement);
    this.container.appendChild(this.efficiencyElement);
    this.container.appendChild(this.directiveElement);
    this.container.appendChild(this.voiceSettingsButton);
    document.body.appendChild(this.voiceSettingsModal);
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        this.toggleVisibility();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        this.toggleCompactMode();
      }
    });

    // Add voice settings button event listeners
    this.voiceSettingsButton.addEventListener('click', () => this.toggleVoiceSettings());
    this.voiceSettingsButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleVoiceSettings();
      }
    });

    // Add voice settings modal event listeners
    const closeButton = this.voiceSettingsModal.querySelector('.close-modal');
    closeButton.addEventListener('click', () => this.toggleVoiceSettings());

    const voiceSelect = this.voiceSettingsModal.querySelector('.voice-select');
    voiceSelect.addEventListener('change', (e) => {
      this.voiceSettings.voiceId = e.target.value;
      this.updateVoiceSettings();
    });

    const speakingRate = this.voiceSettingsModal.querySelector('.speaking-rate');
    speakingRate.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.voiceSettings.speakingRate = value;
      this.voiceSettingsModal.querySelector('.speaking-rate-value').textContent = `${value.toFixed(1)}x`;
      this.updateVoiceSettings();
    });

    // Close modal when clicking outside
    this.voiceSettingsModal.addEventListener('click', (e) => {
      if (e.target === this.voiceSettingsModal) {
        this.toggleVoiceSettings();
      }
    });
  }

  setupPerformanceMonitoring() {
    if (window.performance && window.performance.now) {
      setInterval(() => {
        const now = performance.now();
        const timeDiff = now - this.performanceMetrics.lastUpdate;
        
        // Calculate FPS
        this.performanceMetrics.fps = Math.round(1000 / timeDiff);
        this.performanceMetrics.lastUpdate = now;

        // Update CPU (estimation)
        if (window.navigator.hardwareConcurrency) {
          this.performanceMetrics.cpu = Math.min(
            100,
            Math.round((this.performanceMetrics.fps / 60) * 100)
          );
        }

        // Update memory
        if (window.performance.memory) {
          this.performanceMetrics.memory = Math.round(
            (window.performance.memory.usedJSHeapSize / 
             window.performance.memory.jsHeapSizeLimit) * 100
          );
        }

        this.updatePerformanceDisplay();
      }, 1000);
    }
  }

  setupPurgeStrategies() {
    // Time-based strategy for alert history
    this.purgeScheduler.activateStrategy('timeBased', {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      callback: () => {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        this.alertHistory = this.alertHistory.filter(alert => 
          alert.timestamp > cutoffTime
        );
      }
    });
  }

  handleAlert(alert) {
    this.alertHistory.push(alert);
    
    // Compress if needed
    if (this.alertHistory.length > 1000) {
      const compressionResult = this.compression.optimize(this.alertHistory);
      this.alertHistory = compressionResult.data;
    }
  }

  checkAlertThresholds(config) {
    const alerts = [];

    // Check CPU
    if (this.performanceMetrics.cpu > config.cpu.threshold) {
      alerts.push({
        type: 'cpu',
        level: 'warning',
        message: config.cpu.message,
        value: this.performanceMetrics.cpu,
        timestamp: Date.now()
      });
    }

    // Check memory
    if (this.performanceMetrics.memory > config.memory.threshold) {
      alerts.push({
        type: 'memory',
        level: 'warning',
        message: config.memory.message,
        value: this.performanceMetrics.memory,
        timestamp: Date.now()
      });
    }

    // Check FPS
    if (this.performanceMetrics.fps < config.fps.threshold) {
      alerts.push({
        type: 'fps',
        level: 'warning',
        message: config.fps.message,
        value: this.performanceMetrics.fps,
        timestamp: Date.now()
      });
    }

    return alerts;
  }

  toggleVisibility() {
    this.container.style.display = this.container.style.display === 'none' ? 'block' : 'none';
  }

  toggleCompactMode() {
    this.compactMode = !this.compactMode;
    if (this.compactMode) {
      this.intervalElement.style.display = 'none';
      this.efficiencyElement.style.display = 'none';
      this.directiveElement.style.display = 'none';
    } else {
      this.intervalElement.style.display = 'block';
      this.efficiencyElement.style.display = 'block';
      this.directiveElement.style.display = 'block';
    }
  }

  updatePerformanceDisplay() {
    const performanceElement = this.container.querySelector('.performance-metrics');
    if (performanceElement) {
      performanceElement.innerHTML = `
        <div class="metric-item">
          <span class="metric-label">CPU:</span>
          <span class="metric-value">${this.performanceMetrics.cpu}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Mémoire:</span>
          <span class="metric-value">${this.performanceMetrics.memory}%</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">FPS:</span>
          <span class="metric-value">${this.performanceMetrics.fps}</span>
        </div>
      `;
    }
  }

  async toggleAudio() {
    try {
      if (!this.audioManager) {
        throw new Error('AudioManager not initialized');
      }

      const directiveValue = this.directiveElement.querySelector('.directive-value').textContent;
      if (!directiveValue || directiveValue === '-') {
        throw new Error('No directive to read');
      }

      await this.audioManager.speak(directiveValue);
    } catch (error) {
      console.error('Error in toggleAudio:', error);
      this.showAudioError();
    }
  }

  showAudioError() {
    const audioButton = this.directiveElement.querySelector('.audio-button');
    audioButton.classList.add('error');
    audioButton.querySelector('.audio-text').textContent = 'Erreur';
    
    setTimeout(() => {
      audioButton.classList.remove('error');
      audioButton.querySelector('.audio-text').textContent = 'Lire';
    }, 2000);
  }

  toggleVoiceSettings() {
    const isVisible = this.voiceSettingsModal.style.display !== 'none';
    this.voiceSettingsModal.style.display = isVisible ? 'none' : 'flex';
    
    if (!isVisible) {
      // Update modal values with current settings
      const voiceSelect = this.voiceSettingsModal.querySelector('.voice-select');
      const speakingRate = this.voiceSettingsModal.querySelector('.speaking-rate');
      const speakingRateValue = this.voiceSettingsModal.querySelector('.speaking-rate-value');
      
      voiceSelect.value = this.voiceSettings.voiceId;
      speakingRate.value = this.voiceSettings.speakingRate;
      speakingRateValue.textContent = `${this.voiceSettings.speakingRate.toFixed(1)}x`;
    }
  }

  updateVoiceSettings() {
    if (this.audioManager) {
      this.audioManager.updateVoiceSettings(this.voiceSettings);
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    window.removeEventListener('keydown', this.toggleVisibility);
    window.removeEventListener('keydown', this.toggleCompactMode);
  }
} 