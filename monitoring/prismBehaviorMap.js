/**
 * PRISM Behavior Map
 * Visualisation dynamique de l'évolution comportementale de PRISM
 */

import kernelBus from '../core/KernelBus.js';

class PrismBehaviorMap {
  constructor() {
    this.bus = new PrismBus();
    this.behaviorTimeline = [];
    this.initializeEventListeners();
  }

  /**
   * Initialise les écouteurs d'événements
   */
  initializeEventListeners() {
    // Écoute des ajustements comportementaux
    this.bus.on('prism:learning:adjustmentsMade', (payload) => {
      this.recordBehaviorEvent({
        type: 'adjustment',
        module: payload.module,
        details: payload.adjustment,
        timestamp: Date.now()
      });
    });

    // Écoute des rapports de stress
    this.bus.on('prism:analytics:postStressReport', (payload) => {
      this.recordBehaviorEvent({
        type: 'stress',
        module: payload.affectedModule,
        details: payload.analysis,
        timestamp: Date.now()
      });
    });

    // Écoute des mises à jour des seeds adaptatifs
    this.bus.on('prism:seeds:updated', (payload) => {
      this.recordBehaviorEvent({
        type: 'seed',
        module: payload.module,
        details: payload.seed,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Enregistre un événement comportemental
   * @param {Object} event - L'événement à enregistrer
   */
  recordBehaviorEvent(event) {
    this.behaviorTimeline.push(event);
    this.renderBehaviorMap();
  }

  /**
   * Génère la visualisation de la carte comportementale
   */
  renderBehaviorMap() {
    const container = document.getElementById('behavior-map-container');
    if (!container) return;

    // Création de la timeline
    const timeline = document.createElement('div');
    timeline.className = 'behavior-timeline';

    // Tri des événements par timestamp
    const sortedEvents = [...this.behaviorTimeline].sort((a, b) => a.timestamp - b.timestamp);

    // Création des éléments de la timeline
    sortedEvents.forEach(event => {
      const eventElement = document.createElement('div');
      eventElement.className = `behavior-event ${event.type}`;
      
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      const moduleName = event.module || 'Unknown';
      
      eventElement.innerHTML = `
        <div class="event-header">
          <span class="event-time">${timestamp}</span>
          <span class="event-type">${event.type}</span>
        </div>
        <div class="event-module">${moduleName}</div>
        <div class="event-details">${JSON.stringify(event.details, null, 2)}</div>
      `;

      timeline.appendChild(eventElement);
    });

    // Mise à jour du conteneur
    container.innerHTML = '';
    container.appendChild(timeline);
  }

  /**
   * Initialise le conteneur de visualisation
   * @param {string} containerId - ID du conteneur HTML
   */
  initializeContainer(containerId) {
    const container = document.createElement('div');
    container.id = containerId;
    container.className = 'behavior-map-container';
    document.body.appendChild(container);
  }

  /**
   * Nettoie les ressources
   */
  cleanup() {
    this.bus.clear();
    const container = document.getElementById('behavior-map-container');
    if (container) {
      container.remove();
    }
  }
}

export default PrismBehaviorMap; 