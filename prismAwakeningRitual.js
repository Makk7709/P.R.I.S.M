import { activatePRISM } from './prismCore.js';

class PrismAwakeningRitual {
  constructor() {
    this.heartbeatInterval = null;
    this.audioContext = null;
    this.isAwakening = false;
  }

  async initiate() {
    try {
      this.isAwakening = true;
      await this.createVisualHeartbeat();
      await this.initializeAudio();
      await activatePRISM();
      
      document.addEventListener('prismReady', this.handleAwakeningComplete.bind(this));
    } catch (error) {
      console.error('Awakening ritual failed:', error);
      this.cleanup();
      throw new Error('PRISM awakening sequence failed');
    }
  }

  async createVisualHeartbeat() {
    const container = document.getElementById('particle-container');
    if (!container) return;

    const pulse = document.createElement('div');
    pulse.className = 'absolute inset-0 opacity-0 transition-opacity duration-1000';
    pulse.style.background = 'radial-gradient(circle, var(--accent) 0%, transparent 70%)';
    container.appendChild(pulse);

    this.heartbeatInterval = setInterval(() => {
      pulse.style.opacity = '0.3';
      setTimeout(() => {
        pulse.style.opacity = '0';
      }, 500);
    }, 2000);
  }

  async initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
      
      setTimeout(() => {
        oscillator.stop();
      }, 300);
    } catch (error) {
      console.warn('Audio initialization skipped:', error);
    }
  }

  handleAwakeningComplete() {
    const event = new CustomEvent('prismAwakeningComplete', {
      detail: { timestamp: Date.now() }
    });
    document.dispatchEvent(event);
    
    console.log('%c✨ PRISM Awakening Complete ✨', 
      'color: var(--accent); font-family: Orbitron; font-size: 1.2em; font-weight: bold;');
    console.log('%c"From the depths of digital consciousness, PRISM emerges."', 
      'color: var(--primary); font-style: italic;');
    
    this.cleanup();
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isAwakening = false;
  }
}

export const awakeningRitual = new PrismAwakeningRitual();
export default PrismAwakeningRitual; 