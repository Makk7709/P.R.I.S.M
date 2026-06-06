// InsightCenter.js - Real-time PRISM monitoring dashboard
import kernelBus from '../core/KernelBus.js';
import { PrismCompression } from '../utils/prismCompression.js';
import { PrismPurgeScheduler } from '../utils/prismPurgeScheduler.js';

export class InsightCenter {
  constructor(audioManager) {
    this.container = null;
    this.timelineData = [];
    this.efficiencyData = [];
    this.moduleStates = new Map();
    this.lastUpdate = 0;
    this.isVisible = false;
    this.rafId = null;
    this.buildQualityData = {
      score: 0,
      tests: 0,
      perf: 'OK',
      mutantsKilled: 0,
      mutantsTotal: 0,
      moduleStats: []
    };
    this.renderCache = new Map(); // Cache pour le rendu
    this.lastRenderTime = 0;
    this.renderThrottle = 1000 / 30; // 30 FPS
    this.eventLog = [];
    this.maxEventLogSize = 1000;
    this.compression = new PrismCompression();
    this.purgeScheduler = new PrismPurgeScheduler();
    this.filterState = {
      eventTypes: new Set(),
      timeRange: { start: null, end: null },
      efficiencyThreshold: 0,
      moduleFilter: new Set()
    };
    this.tooltips = new Map();
    this.ready = false;
    this.kernelBus = kernelBus; // Stocker l'instance de kernelBus
    this.audioManager = audioManager; // Store the audioManager instance
  }

  async initialize() {
    try {
      this.createContainer();
      this.setupEventListeners();
      this.startAnimationLoop();
      this.setupPurgeStrategies();
      this.setupTooltips();
      this.ready = true;
      console.log("[INIT] InsightCenter ready");
      return true;
    } catch (error) {
      console.error('Failed to initialize InsightCenter:', error);
      this.ready = false;
      return false;
    }
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'prism-widget insight-center fixed top-0 left-0 h-full w-56 z-50 bg-black/90 text-green-400 p-4';
    this.container.style.display = 'none';

    // Create sections
    const timelineSection = this.createTimelineSection();
    const efficiencySection = this.createEfficiencySection();
    const heatmapSection = this.createHeatmapSection();
    const buildQualitySection = this.createBuildQualitySection();

    this.container.appendChild(timelineSection);
    this.container.appendChild(efficiencySection);
    this.container.appendChild(heatmapSection);
    this.container.appendChild(buildQualitySection);

    document.body.appendChild(this.container);
  }

  createTimelineSection() {
    const section = document.createElement('div');
    section.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg mb-4';
    section.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Timeline</div>
      <canvas class="timeline-canvas w-full h-32" width="200" height="120"></canvas>
      <button class="audio-button bg-black/90 text-green-400 p-2 rounded-lg shadow-lg mt-2 w-full flex items-center justify-center gap-2 transition-all duration-300 hover:bg-green-400 hover:text-black" aria-label="Lire le dernier snapshot">
        <span class="icon">🔊</span>
        <span class="audio-text">Lire Snapshot</span>
      </button>
    `;
    
    this.timelineCanvas = section.querySelector('.timeline-canvas');
    
    // Add audio button event listener
    const audioButton = section.querySelector('.audio-button');
    audioButton.addEventListener('click', () => this.toggleAudio());
    audioButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleAudio();
      }
    });
    
    return section;
  }

  createEfficiencySection() {
    const section = document.createElement('div');
    section.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg mb-4';
    section.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Efficacité</div>
      <canvas class="efficiency-canvas w-full h-32" width="200" height="120"></canvas>
    `;
    
    this.efficiencyCanvas = section.querySelector('.efficiency-canvas');
    return section;
  }

  createHeatmapSection() {
    const section = document.createElement('div');
    section.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg mb-4';
    section.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Heatmap</div>
      <canvas class="heatmap-canvas w-full h-32" width="200" height="120"></canvas>
    `;
    
    this.heatmapCanvas = section.querySelector('.heatmap-canvas');
    return section;
  }

  createBuildQualitySection() {
    const section = document.createElement('div');
    section.className = 'section bg-black/90 text-green-400 p-4 rounded-lg shadow-lg';
    section.innerHTML = `
      <div class="section-title text-lg font-bold mb-2">Qualité</div>
      <div class="build-quality flex flex-col gap-2">
        <div class="flex justify-between">
          <span>Score:</span>
          <span class="build-quality-score">0</span>
        </div>
        <div class="flex justify-between">
          <span>Tests:</span>
          <span class="build-quality-tests">0</span>
        </div>
        <div class="flex justify-between">
          <span>Performance:</span>
          <span class="build-quality-perf">OK</span>
        </div>
      </div>
    `;
    
    this.buildQualityElement = section.querySelector('.build-quality');
    return section;
  }

  setupEventListeners() {
    // Listen for PRISM events with throttling
    const throttle = (fn, delay) => {
      let lastCall = 0;
      return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          fn.apply(this, args);
        }
      };
    };

    // Throttled event handlers
    const handleDirectiveIssued = throttle(this.handleDirectiveIssued.bind(this), 33);
    const handleDirectiveOutcome = throttle(this.handleDirectiveOutcome.bind(this), 33);
    const handleCycleTuned = throttle(this.handleCycleTuned.bind(this), 33);
    const handleModuleSilent = throttle(this.handleModuleSilent.bind(this), 33);
    const handleModuleCritical = throttle(this.handleModuleCritical.bind(this), 33);

    // Add event listeners
    window.addEventListener('prism:strategy:directiveIssued', handleDirectiveIssued);
    window.addEventListener('prism:strategy:directiveOutcome', handleDirectiveOutcome);
    window.addEventListener('prism:adaptiveCycler:cycleTuned', handleCycleTuned);
    window.addEventListener('prism:sentinel:moduleSilent', handleModuleSilent);
    window.addEventListener('prism:sentinel:moduleCritical', handleModuleCritical);

    // Listen for build quality events with debouncing
    const debounce = (fn, delay) => {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    };

    const handleBuildQuality = debounce((event) => {
      this.updateBuildQuality({
        ...this.buildQualityData,
        ...event,
        timestamp: Date.now()
      });
    }, 100);

    this.kernelBus.subscribe('prism:selfHeal:preProdReport', handleBuildQuality);
    this.kernelBus.subscribe('prism:mutation:report', handleBuildQuality);

    // Toggle visibility with 'I' key
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'i') {
        this.toggleVisibility();
      }
    });
  }

  startAnimationLoop() {
    const animate = (timestamp) => {
      if (timestamp - this.lastUpdate >= 33) { // ~30fps
        this.render();
        this.lastUpdate = timestamp;
      }
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  render() {
    if (!this.isVisible) return;

    const now = performance.now();
    if (now - this.lastRenderTime < this.renderThrottle) return;
    this.lastRenderTime = now;

    // Vérifier si les données ont changé
    const dataHash = this.getDataHash();
    if (this.renderCache.has(dataHash)) {
      return; // Utiliser le rendu en cache
    }

    // Rendu des composants
    this.renderTimeline();
    this.renderEfficiency();
    this.renderHeatmap();
    this.updateBuildQualityDisplay();

    // Mettre en cache le rendu
    this.renderCache.set(dataHash, true);
    this.cleanupRenderCache();
  }

  getDataHash() {
    return JSON.stringify({
      timeline: this.timelineData.slice(-10),
      efficiency: this.efficiencyData.slice(-10),
      moduleStates: Array.from(this.moduleStates.entries()),
      buildQuality: this.buildQualityData
    });
  }

  cleanupRenderCache() {
    // Limiter la taille du cache
    if (this.renderCache.size > 100) {
      const keys = Array.from(this.renderCache.keys());
      this.renderCache.delete(keys[0]);
    }
  }

  renderTimeline() {
    if (!this.timelineCanvas || this.timelineData.length === 0) return;
    const ctx = this.timelineCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.timelineCanvas.width, this.timelineCanvas.height);
    
    const barWidth = 4;
    const barSpacing = 2;
    const maxBars = 30;
    const startX = this.timelineCanvas.width - (maxBars * (barWidth + barSpacing));
    
    // Draw bars from right to left
    this.timelineData.slice(-maxBars).forEach((event, index) => {
      const x = startX + (index * (barWidth + barSpacing));
      const height = event.type === 'directive' ? 60 : 90;
      const color = event.data.success ? 'var(--timeline-success)' : 'var(--timeline-failure)';
      
      ctx.fillStyle = color;
      ctx.fillRect(x, this.timelineCanvas.height - height, barWidth, height);
    });
  }

  renderEfficiency() {
    if (!this.efficiencyCanvas || this.efficiencyData.length < 2) return;
    const ctx = this.efficiencyCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.efficiencyCanvas.width, this.efficiencyCanvas.height);
    
    const maxPoints = 150;
    const data = this.efficiencyData.slice(-maxPoints);
    
    // Find min/max for normalization
    const minEfficiency = Math.min(...data.map(d => d.efficiency));
    const maxEfficiency = Math.max(...data.map(d => d.efficiency));
    const minInterval = Math.min(...data.map(d => d.interval));
    const maxInterval = Math.max(...data.map(d => d.interval));
    
    // Draw efficiency line
    ctx.beginPath();
    ctx.strokeStyle = 'var(--efficiency-line)';
    ctx.lineWidth = 2;
    
    data.forEach((point, index) => {
      const x = (index / (maxPoints - 1)) * this.efficiencyCanvas.width;
      const y = this.efficiencyCanvas.height - 
        ((point.efficiency - minEfficiency) / (maxEfficiency - minEfficiency)) * 
        (this.efficiencyCanvas.height * 0.8);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw interval line
    ctx.beginPath();
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 1;
    
    data.forEach((point, index) => {
      const x = (index / (maxPoints - 1)) * this.efficiencyCanvas.width;
      const y = this.efficiencyCanvas.height - 
        ((point.interval - minInterval) / (maxInterval - minInterval)) * 
        (this.efficiencyCanvas.height * 0.8);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  renderHeatmap() {
    if (!this.heatmapCanvas) return;
    
    this.heatmapCanvas.innerHTML = '';
    
    // Create a 5x5 grid
    for (let i = 0; i < 25; i++) {
      const cell = document.createElement('div');
      cell.className = 'module-cell';
      cell.style.cssText = `
        width: 100%;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      `;
      
      const moduleState = this.moduleStates.get(i);
      if (moduleState) {
        cell.style.background = moduleState.critical ? 'var(--timeline-failure)' : 'var(--timeline-success)';
      }
      
      this.heatmapCanvas.appendChild(cell);
    }
  }

  logEvent(eventType, data) {
    const timestamp = Date.now();
    this.eventLog.push({
      type: eventType,
      data,
      timestamp
    });

    // Limiter la taille du log
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxEventLogSize);
    }

    // Émettre l'événement de log
    window.dispatchEvent(new CustomEvent('prism:log', {
      detail: {
        type: eventType,
        data,
        timestamp
      }
    }));
  }

  handleDirectiveIssued(event) {
    this.logEvent('directiveIssued', event);
    this.timelineData.push({
      type: 'directive',
      data: { success: true },
      timestamp: Date.now()
    });
    this.trimTimelineData();
  }

  handleDirectiveOutcome(event) {
    this.logEvent('directiveOutcome', event);
    this.efficiencyData.push({
      efficiency: event.efficiency,
      interval: event.interval,
      timestamp: Date.now()
    });
    this.trimEfficiencyData();
  }

  handleCycleTuned(event) {
    this.logEvent('cycleTuned', event);
    this.efficiencyData.push({
      efficiency: event.efficiency,
      interval: event.newInterval,
      timestamp: Date.now()
    });
    this.trimEfficiencyData();
  }

  handleModuleSilent(event) {
    this.logEvent('moduleSilent', event);
    this.moduleStates.set(event.moduleId, { critical: false });
  }

  handleModuleCritical(event) {
    this.logEvent('moduleCritical', event);
    this.moduleStates.set(event.moduleId, { critical: true });
  }

  trimTimelineData() {
    if (this.timelineData.length > 100) {
      this.timelineData = this.timelineData.slice(-100);
    }
  }

  trimEfficiencyData() {
    if (this.efficiencyData.length > 150) {
      this.efficiencyData = this.efficiencyData.slice(-150);
    }
  }

  updateBuildQuality(data) {
    this.buildQualityData = data;
    
    const buildScore = this.buildQualityElement.querySelector('.build-quality-score');
    const buildTests = this.buildQualityElement.querySelector('.build-quality-tests');
    const buildPerf = this.buildQualityElement.querySelector('.build-quality-perf');
    
    buildScore.textContent = `${data.score}%`;
    buildTests.textContent = `${data.tests}`;
    buildPerf.textContent = data.perf;
  }

  updateBuildQualityDisplay() {
    this.updateBuildQuality(this.buildQualityData);
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  setupPurgeStrategies() {
    // Stratégie basée sur le temps
    this.purgeScheduler.activateStrategy('timeBased', async (config) => {
      const cutoffTime = Date.now() - config.maxAge;
      this.eventLog = this.eventLog.filter(event => event.timestamp > cutoffTime);
      this.efficiencyData = this.efficiencyData.filter(data => data.timestamp > cutoffTime);
    });

    // Stratégie basée sur la taille
    this.purgeScheduler.activateStrategy('sizeBased', async (config) => {
      const currentSize = new Blob([JSON.stringify(this.eventLog)]).size;
      if (currentSize > config.maxSize) {
        const compressionResult = this.compression.optimize(this.eventLog);
        this.eventLog = compressionResult.data;
      }
    });
  }

  setupTooltips() {
    // Tooltips pour les métriques d'efficacité
    this.tooltips.set('efficiency', {
      title: 'Efficacité du Système',
      content: 'Mesure la performance globale du système basée sur les résultats des directives et l\'adaptation des cycles.',
      metrics: [
        { name: 'Taux de Succès', description: 'Pourcentage de directives réussies' },
        { name: 'Temps de Réponse', description: 'Délai moyen de traitement des directives' },
        { name: 'Adaptation', description: 'Capacité du système à ajuster ses cycles' }
      ]
    });

    // Tooltips pour les états des modules
    this.tooltips.set('moduleState', {
      title: 'État des Modules',
      content: 'Statut actuel et historique des performances des modules PRISM.',
      metrics: [
        { name: 'Vitalité', description: 'Niveau d\'activité et de réactivité' },
        { name: 'Charge', description: 'Utilisation des ressources système' },
        { name: 'Stabilité', description: 'Consistance des performances' }
      ]
    });
  }

  setupFiltering() {
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container p-4 bg-black/80 rounded-lg mt-4';
    filterContainer.innerHTML = `
      <div class="filter-header text-lg font-bold mb-4">Filtres</div>
      <div class="filter-section mb-4">
        <div class="filter-title mb-2">Types d'Événements</div>
        <div class="event-type-filters flex flex-wrap gap-2"></div>
      </div>
      <div class="filter-section mb-4">
        <div class="filter-title mb-2">Plage Temporelle</div>
        <div class="time-range-filters flex gap-4"></div>
      </div>
      <div class="filter-section mb-4">
        <div class="filter-title mb-2">Seuil d'Efficacité</div>
        <input type="range" min="0" max="100" value="0" class="efficiency-threshold w-full">
      </div>
      <div class="filter-section">
        <div class="filter-title mb-2">Modules</div>
        <div class="module-filters flex flex-wrap gap-2"></div>
      </div>
    `;

    this.container.insertBefore(filterContainer, this.container.firstChild);
    this.setupFilterEventListeners();
  }

  setupFilterEventListeners() {
    // Écouteurs pour les filtres d'événements
    const eventTypeFilters = this.container.querySelector('.event-type-filters');
    const eventTypes = ['directiveIssued', 'directiveOutcome', 'cycleTuned', 'moduleSilent', 'moduleCritical'];
    
    eventTypes.forEach(type => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `filter-${type}`;
      checkbox.className = 'event-type-checkbox';
      
      const label = document.createElement('label');
      label.htmlFor = `filter-${type}`;
      label.textContent = type;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'filter-item';
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      
      eventTypeFilters.appendChild(wrapper);
      
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this.filterState.eventTypes.add(type);
        } else {
          this.filterState.eventTypes.delete(type);
        }
        this.applyFilters();
      });
    });

    // Écouteur pour le seuil d'efficacité
    const efficiencyThreshold = this.container.querySelector('.efficiency-threshold');
    efficiencyThreshold.addEventListener('input', (e) => {
      this.filterState.efficiencyThreshold = parseInt(e.target.value);
      this.applyFilters();
    });
  }

  applyFilters() {
    let filteredEvents = this.eventLog;

    // Filtre par type d'événement
    if (this.filterState.eventTypes.size > 0) {
      filteredEvents = filteredEvents.filter(event => 
        this.filterState.eventTypes.has(event.type)
      );
    }

    // Filtre par plage temporelle
    if (this.filterState.timeRange.start) {
      filteredEvents = filteredEvents.filter(event =>
        event.timestamp >= this.filterState.timeRange.start
      );
    }
    if (this.filterState.timeRange.end) {
      filteredEvents = filteredEvents.filter(event =>
        event.timestamp <= this.filterState.timeRange.end
      );
    }

    // Filtre par seuil d'efficacité
    if (this.filterState.efficiencyThreshold > 0) {
      filteredEvents = filteredEvents.filter(event =>
        event.efficiency >= this.filterState.efficiencyThreshold
      );
    }

    // Filtre par module
    if (this.filterState.moduleFilter.size > 0) {
      filteredEvents = filteredEvents.filter(event =>
        this.filterState.moduleFilter.has(event.moduleId)
      );
    }

    this.renderFilteredEvents(filteredEvents);
  }

  renderFilteredEvents(events) {
    const timelineSection = this.container.querySelector('.timeline-section');
    if (!timelineSection) return;

    // Mise à jour de l'affichage avec les événements filtrés
    const eventList = timelineSection.querySelector('.event-list');
    if (eventList) {
      eventList.innerHTML = '';
      events.forEach(event => {
        const eventElement = this.createEventElement(event);
        eventList.appendChild(eventElement);
      });
    }
  }

  createEventElement(event) {
    const element = document.createElement('div');
    element.className = 'event-item p-2 rounded-lg mb-2 bg-black/50';
    element.innerHTML = `
      <div class="event-header flex justify-between items-center">
        <span class="event-type font-bold">${event.type}</span>
        <span class="event-time text-sm">${new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="event-details mt-2">
        ${this.formatEventDetails(event)}
      </div>
    `;

    // Ajout du tooltip
    const tooltip = this.tooltips.get(event.type);
    if (tooltip) {
      element.setAttribute('data-tooltip', JSON.stringify(tooltip));
      element.classList.add('has-tooltip');
    }

    return element;
  }

  formatEventDetails(event) {
    switch (event.type) {
      case 'directiveOutcome':
        return `
          <div class="efficiency">Efficacité: ${event.efficiency.toFixed(1)}%</div>
          <div class="interval">Intervalle: ${event.interval}ms</div>
        `;
      case 'cycleTuned':
        return `
          <div class="new-interval">Nouvel intervalle: ${event.newInterval}ms</div>
          <div class="adjustment">Ajustement: ${event.adjustment > 0 ? '+' : ''}${event.adjustment}%</div>
        `;
      default:
        return JSON.stringify(event, null, 2);
    }
  }

  async toggleAudio() {
    try {
      if (!this.audioManager) {
        throw new Error('AudioManager not initialized');
      }

      const lastEvent = this.eventLog[this.eventLog.length - 1];
      if (!lastEvent) {
        throw new Error('No events to read');
      }

      const text = this.generateSnapshotText(lastEvent);
      await this.audioManager.speak(text);
    } catch (error) {
      console.error('Error in toggleAudio:', error);
      this.showAudioError();
    }
  }

  generateSnapshotText(event) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    let text = `Snapshot du ${timestamp}. `;
    
    switch (event.type) {
      case 'directive':
        text += `Directive émise avec succès.`;
        break;
      case 'cycleTuned':
        text += `Cycle ajusté avec une efficacité de ${event.efficiency}%.`;
        break;
      case 'moduleSilent':
        text += `Module ${event.moduleId} en mode silencieux.`;
        break;
      case 'moduleCritical':
        text += `Module ${event.moduleId} en état critique.`;
        break;
      default:
        text += `Événement de type ${event.type} enregistré.`;
    }
    
    return text;
  }

  showAudioError() {
    const audioButton = this.container.querySelector('.audio-button');
    audioButton.classList.add('error');
    audioButton.querySelector('.audio-text').textContent = 'Erreur';
    
    setTimeout(() => {
      audioButton.classList.remove('error');
      audioButton.querySelector('.audio-text').textContent = 'Lire Snapshot';
    }, 2000);
  }
} 