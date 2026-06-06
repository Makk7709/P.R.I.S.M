/**
 * @fileoverview Strategic Layer V2 - Gestion des directives composites
 * @module regulation/prismStrategicLayer
 */

import { PrismValidator } from '../prismValidator.js';
import PrismHMAC from '../security/prismHMAC.js';
import { PrismProfiler } from '../perf/prismProfiler.js';

const COOLDOWN_DURATION = 300000; // 5 minutes en ms
const MAX_SECONDARY_DIRECTIVES = 2;
const SIMILARITY_THRESHOLD = 0.5;

class PrismStrategicLayer {
  constructor() {
    this.lastCompositeTimestamp = 0;
    this.lastCompositeDirectives = [];
    this.validator = new PrismValidator();
  }

  /**
   * Génère des directives composites basées sur les risques analysés
   * @param {Array<Object>} risks - Liste des risques analysés
   * @returns {Promise<Object>} Directives composites générées
   */
  async generateCompositeDirectives(risks) {
    PrismProfiler.start('strategic:generate');
    const startTime = performance.now();

    // Vérifier le cooldown
    if (this.isInCooldown()) {
      PrismProfiler.end('strategic:generate');
      return null;
    }

    // Sélectionner les TOP 3 risques par gravité
    PrismProfiler.start('strategic:selectTopRisks');
    const topRisks = this.selectTopRisks(risks);
    PrismProfiler.end('strategic:selectTopRisks');
    
    if (!topRisks.length) {
      PrismProfiler.end('strategic:generate');
      return null;
    }

    // Générer les directives
    PrismProfiler.start('strategic:generateDirectives');
    const directives = this.generateDirectivesFromRisks(topRisks);
    PrismProfiler.end('strategic:generateDirectives');
    
    // Résoudre les conflits
    PrismProfiler.start('strategic:resolveConflicts');
    const resolvedDirectives = this.resolveConflicts(directives);
    PrismProfiler.end('strategic:resolveConflicts');

    // Vérifier la similarité avec la dernière émission
    if (this.isSimilarToLastEmission(resolvedDirectives)) {
      PrismProfiler.end('strategic:generate');
      return null;
    }

    // Émettre l'événement
    const composite = {
      directives: resolvedDirectives,
      timestamp: Date.now(),
      cooldownApplied: true
    };

    // Sign the payload
    const signature = await PrismHMAC.sign(composite);
    if (signature) {
      composite.sig = signature;
    }

    this.lastCompositeTimestamp = composite.timestamp;
    this.lastCompositeDirectives = resolvedDirectives;

    prismBus.emit('prism:strategy:compositeIssued', composite);

    const endTime = performance.now();
    console.log(`Composite directives generated in ${endTime - startTime}ms`);

    PrismProfiler.end('strategic:generate');
    return composite;
  }

  /**
   * Sélectionne les TOP 3 risques par gravité
   * @private
   */
  selectTopRisks(risks) {
    return risks
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 3);
  }

  /**
   * Génère les directives à partir des risques
   * @private
   */
  generateDirectivesFromRisks(risks) {
    return risks.map((risk, index) => ({
      directive: this.mapRiskToDirective(risk),
      priority: index + 1,
      confidence: this.calculateConfidence(risk)
    }));
  }

  /**
   * Résout les conflits entre directives
   * @private
   */
  resolveConflicts(directives) {
    const moduleActions = new Map();

    directives.forEach(directive => {
      const module = this.getModuleFromDirective(directive.directive);
      if (!moduleActions.has(module)) {
        moduleActions.set(module, []);
      }
      moduleActions.get(module).push(directive);
    });

    const resolved = [];
    moduleActions.forEach(moduleDirectives => {
      if (moduleDirectives.length > 1) {
        // Garder la directive avec la priorité la plus élevée
        resolved.push(moduleDirectives.sort((a, b) => a.priority - b.priority)[0]);
      } else {
        resolved.push(moduleDirectives[0]);
      }
    });

    return resolved;
  }

  /**
   * Vérifie si le système est en cooldown
   * @private
   */
  isInCooldown() {
    return Date.now() - this.lastCompositeTimestamp < COOLDOWN_DURATION;
  }

  /**
   * Vérifie la similarité avec la dernière émission
   * @private
   */
  isSimilarToLastEmission(newDirectives) {
    if (!this.lastCompositeDirectives.length) return false;

    const commonDirectives = newDirectives.filter(newDir =>
      this.lastCompositeDirectives.some(lastDir => lastDir.directive === newDir.directive)
    );

    return commonDirectives.length / newDirectives.length > SIMILARITY_THRESHOLD;
  }

  /**
   * Calcule la confiance d'une directive
   * @private
   */
  calculateConfidence(risk) {
    return Math.min(0.95, 0.7 + (risk.severity * 0.3));
  }

  /**
   * Extrait le module ciblé d'une directive
   * @private
   */
  getModuleFromDirective(directive) {
    // Logique de mapping à implémenter selon les besoins
    return directive.split('_')[0];
  }

  /**
   * Map un risque vers une directive
   * @private
   */
  mapRiskToDirective(risk) {
    // Logique de mapping à implémenter selon les besoins
    return `boost_${risk.type}`;
  }
}

export default new PrismStrategicLayer(); 