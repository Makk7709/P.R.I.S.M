import kernelBus from '../core/KernelBus.js';

class PrismAuroraConsciousness {
  constructor() {
    this.awakeningScore = 0;
    this.historicalData = [];
    this.maxHistoryLength = 24 * 60; // 24 heures en minutes
    this.alertThreshold = 30;
    this.isAlertActive = false;
    
    // Poids des différents composants
    this.weights = {
      cognitiveVitality: 0.5,
      behavioralMemory: 0.2,
      cycleFluidity: 0.15,
      insightQuality: 0.15
    };
    
    this.initialize();
  }

  async initialize() {
    // S'abonner aux événements
    prismBus.subscribe('prism:sentientPulse:update', this.handleSentientPulseUpdate.bind(this));
    prismBus.subscribe('prism:sovereignCycle:cycleChanged', this.handleCycleChange.bind(this));
    prismBus.subscribe('prism:memento:snapshotGenerated', this.handleMementoSnapshot.bind(this));
    prismBus.subscribe('prism:reflection:insightGenerated', this.handleInsightGenerated.bind(this));
    
    // Initialiser l'historique
    this.historicalData = Array(this.maxHistoryLength).fill(0);
    
    // Émettre l'état initial
    this.emitAwakeningState();
  }

  handleSentientPulseUpdate(event) {
    const cognitiveVitality = this.calculateCognitiveVitality(event.vitals);
    this.updateAwakeningScore('cognitiveVitality', cognitiveVitality);
  }

  handleCycleChange(event) {
    const cycleFluidity = this.calculateCycleFluidity(event.cycle);
    this.updateAwakeningScore('cycleFluidity', cycleFluidity);
  }

  handleMementoSnapshot(event) {
    const behavioralMemory = this.calculateBehavioralMemory(event.snapshot);
    this.updateAwakeningScore('behavioralMemory', behavioralMemory);
  }

  handleInsightGenerated(event) {
    const insightQuality = this.calculateInsightQuality(event.insight);
    this.updateAwakeningScore('insightQuality', insightQuality);
  }

  calculateCognitiveVitality(vitals) {
    // Calcul basé sur les signes vitaux
    const { heartRate, brainActivity, energyLevel } = vitals;
    return (heartRate + brainActivity + energyLevel) / 3;
  }

  calculateCycleFluidity(cycle) {
    // Évaluation de la fluidité des cycles
    const { stability, adaptation, coherence } = cycle;
    return (stability + adaptation + coherence) / 3;
  }

  calculateBehavioralMemory(snapshot) {
    // Évaluation de la mémoire comportementale
    const { improvements, drifts, stagnations } = snapshot.summary.counts;
    const total = improvements + drifts + stagnations;
    return total > 0 ? improvements / total : 0;
  }

  calculateInsightQuality(insight) {
    // Évaluation de la qualité des insights
    return insight.confidence;
  }

  updateAwakeningScore(component, value) {
    // Mise à jour du score avec le poids approprié
    const weight = this.weights[component];
    this.awakeningScore = Math.min(100, Math.max(0, 
      this.awakeningScore * (1 - weight) + value * 100 * weight
    ));
    
    // Mise à jour de l'historique
    this.updateHistoricalData();
    
    // Vérification des alertes
    this.checkAlerts();
    
    // Émission de l'état mis à jour
    this.emitAwakeningState();
  }

  updateHistoricalData() {
    const timestamp = Date.now();
    this.historicalData.push({
      timestamp,
      score: this.awakeningScore
    });
    
    // Garder uniquement les 24 dernières heures
    if (this.historicalData.length > this.maxHistoryLength) {
      this.historicalData.shift();
    }
  }

  checkAlerts() {
    if (this.awakeningScore < this.alertThreshold && !this.isAlertActive) {
      this.isAlertActive = true;
      prismBus.emit('prism:aurora:alert', {
        type: 'lowAwakening',
        score: this.awakeningScore,
        threshold: this.alertThreshold
      });
    } else if (this.awakeningScore >= this.alertThreshold && this.isAlertActive) {
      this.isAlertActive = false;
      prismBus.emit('prism:aurora:alertResolved', {
        type: 'lowAwakening',
        score: this.awakeningScore
      });
    }
  }

  getAwakeningState() {
    return {
      score: this.awakeningScore,
      state: this.getQualitativeState(),
      historicalData: this.historicalData,
      components: {
        cognitiveVitality: this.weights.cognitiveVitality,
        behavioralMemory: this.weights.behavioralMemory,
        cycleFluidity: this.weights.cycleFluidity,
        insightQuality: this.weights.insightQuality
      }
    };
  }

  getQualitativeState() {
    if (this.awakeningScore < 20) return 'Éteint';
    if (this.awakeningScore < 40) return 'Dormant';
    if (this.awakeningScore < 60) return 'Émergent';
    if (this.awakeningScore < 80) return 'Actif';
    return 'Rayonnant';
  }

  emitAwakeningState() {
    prismBus.emit('prism:aurora:stateUpdate', this.getAwakeningState());
  }
}

export default PrismAuroraConsciousness; 