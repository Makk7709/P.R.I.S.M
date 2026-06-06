/**
 * @fileoverview Module de sécurité pour la validation et le rate-limiting des événements PRISM
 * @module security/prismEventGuard
 */

import PrismHMAC from './prismHMAC.js';

const RATE_LIMIT_WINDOW = 10000; // 10 secondes
const RATE_LIMIT_MAX = 20; // 20 événements par fenêtre

/**
 * @typedef {Object} DirectiveOutcome
 * @property {string} directive - La directive exécutée
 * @property {string} module - Le module source
 * @property {('success'|'failure')} result - Le résultat de l'exécution
 * @property {number} timestamp - Timestamp de l'événement
 * @property {string} [sig] - Signature HMAC optionnelle
 */

class PrismEventGuard {
  constructor() {
    this.eventCounters = new Map();
    this.startCleanupInterval();
  }

  /**
   * Valide le schéma d'un événement directiveOutcome
   * @param {DirectiveOutcome} event - L'événement à valider
   * @returns {boolean} - True si l'événement est valide
   */
  validateOutcome(event) {
    try {
      if (!event || typeof event !== 'object') {
        console.warn('⚠️ Event invalide: payload manquant ou mal formé');
        return false;
      }

      const { directive, module, result, timestamp } = event;

      if (typeof directive !== 'string' || !directive) {
        console.warn('⚠️ Event invalide: directive manquante ou invalide');
        return false;
      }

      if (typeof module !== 'string' || !module) {
        console.warn('⚠️ Event invalide: module manquant ou invalide');
        return false;
      }

      if (result !== 'success' && result !== 'failure') {
        console.warn('⚠️ Event invalide: result doit être "success" ou "failure"');
        return false;
      }

      if (typeof timestamp !== 'number' || timestamp <= 0) {
        console.warn('⚠️ Event invalide: timestamp invalide');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error);
      return false;
    }
  }

  /**
   * Vérifie si un module a dépassé sa limite de rate
   * @param {string} module - Le module à vérifier
   * @returns {boolean} - True si le module n'a pas dépassé sa limite
   */
  checkRateLimit(module) {
    const now = Date.now();
    const moduleCounter = this.eventCounters.get(module) || { count: 0, windowStart: now };

    // Réinitialiser le compteur si la fenêtre est expirée
    if (now - moduleCounter.windowStart >= RATE_LIMIT_WINDOW) {
      moduleCounter.count = 0;
      moduleCounter.windowStart = now;
    }

    // Incrémenter le compteur
    moduleCounter.count++;
    this.eventCounters.set(module, moduleCounter);

    if (moduleCounter.count > RATE_LIMIT_MAX) {
      console.warn(`🚫 Rate limit dépassé pour le module ${module}`);
      return false;
    }

    return true;
  }

  /**
   * Vérifie la signature HMAC d'un événement
   * @param {DirectiveOutcome} event - L'événement à vérifier
   * @returns {Promise<boolean>} - True si la signature est valide ou absente
   */
  async verifySignature(event) {
    if (!event.sig) return true; // Pas de signature = pas de vérification

    try {
      const { sig, ...payload } = event;
      const isValid = await PrismHMAC.verify(payload, sig);
      
      if (!isValid) {
        console.warn('❗ Signature HMAC invalide');
        return false;
      }

      console.log('🔐 Signature HMAC validée');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de la signature:', error);
      return false;
    }
  }

  /**
   * Point d'entrée principal pour la validation d'un événement
   * @param {DirectiveOutcome} event - L'événement à valider
   * @returns {Promise<boolean>} - True si l'événement passe toutes les validations
   */
  async guardOutcome(event) {
    if (!this.validateOutcome(event)) return false;
    if (!this.checkRateLimit(event.module)) return false;
    if (!(await this.verifySignature(event))) return false;
    return true;
  }

  /**
   * Démarre l'intervalle de nettoyage des compteurs
   * @private
   */
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [module, counter] of this.eventCounters.entries()) {
        if (now - counter.windowStart >= RATE_LIMIT_WINDOW) {
          this.eventCounters.delete(module);
        }
      }
    }, RATE_LIMIT_WINDOW);
  }
}

export default new PrismEventGuard(); 