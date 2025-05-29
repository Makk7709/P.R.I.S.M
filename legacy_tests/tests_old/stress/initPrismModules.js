/**
 * @fileoverview Script d'initialisation des modules PRISM pour les tests de charge
 */

import kernelBus from '../../core/KernelBus.js';
import performanceMonitor from '../../monitoring/prismPerformanceMonitor.js';

// Liste des modules PRISM à initialiser
const PRISM_MODULES = [
  'PrismEmotion',
  'PrismAdaptation',
  'PrismMemento',
  'PrismSentience',
  'PrismEnergy',
  'PrismBond',
  'PrismPulse',
  'PrismMuse',
  'PrismGhost',
  'PrismSleep',
  'PrismHarmony'
];

async function initPrismModules() {
  console.log('🚀 Initialisation des modules PRISM...');
  
  // Configurer le monitoring de performance
  performanceMonitor.setConfig({
    samplingInterval: 100,
    maxHistorySize: 10000,
    enabled: true
  });
  
  // Initialiser chaque module
  for (const moduleName of PRISM_MODULES) {
    try {
      console.log(`Initialisation du module ${moduleName}...`);
      
      // Émettre l'événement d'initialisation du module
      await kernelBus.publish('prism:core:module:init', {
        module: moduleName,
        timestamp: Date.now()
      });
      
      // Attendre que le module soit prêt
      await new Promise((resolve) => {
        const handler = (data) => {
          if (data.module === moduleName && data.status === 'ready') {
            kernelBus.unsubscribe(handler);
            resolve();
          }
        };
        kernelBus.subscribe('prism:core:module:status', handler);
      });
      
      console.log(`✅ Module ${moduleName} initialisé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'initialisation du module ${moduleName}:`, error);
      throw error;
    }
  }
  
  console.log('✅ Tous les modules PRISM sont initialisés et prêts');
}

// Exporter la fonction d'initialisation
export default initPrismModules; 