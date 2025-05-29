/**
 * PRISM Kernel Bus System
 * Core event bus and error handling system for PRISM architecture
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Import TrustContext and security config
import { getTrustContext } from '../src/core/TrustContext.js';
import { SECURITY_CONFIG, SECURITY_UTILS } from '../config/security.js';
import PriorityQueue, { Priority } from '../src/core/PriorityQueue.js';
import ConsensusManager, { DecisionType, ConsensusStatus } from '../src/core/ConsensusManager.js';
import crypto from 'crypto';

// Implémentation d'EventEmitter compatible avec le navigateur
class EventEmitter {
  constructor() {
    this.events = new Map();
    this.maxListeners = 10;
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    const listeners = this.events.get(event);
    if (listeners.length >= this.maxListeners) {
      console.warn(`Warning: Possible EventEmitter memory leak detected. ${listeners.length} listeners added. Use emitter.setMaxListeners() to increase limit`);
    }
    listeners.push(listener);
    return this;
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return false;
    const listeners = this.events.get(event);
    listeners.forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
    return true;
  }

  removeListener(event, listener) {
    if (!this.events.has(event)) return this;
    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    return this;
  }

  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  setMaxListeners(n) {
    this.maxListeners = n;
    return this;
  }
}

export class KernelBus extends EventEmitter {
  constructor() {
    super();
    this.subscriptions = new Map();
    // Remplacer l'array FIFO par PriorityQueue
    this.priorityQueue = new PriorityQueue();
    this.isProcessing = false;
    this.PREFIX = 'prism:';
    this.metrics = {
      publishedEvents: 0,
      failedEvents: 0,
      processingTime: 0,
      lastError: null,
      eventLatencies: [],
      securityChecks: 0,
      blockedEvents: 0,
      consensusRequests: 0,
      consensusApprovals: 0,
      consensusRejections: 0,
      consensusTimeouts: 0
    };
    
    // Initialize TrustContext
    this.trustContext = null;
    this.securityEnabled = true;
    
    // Initialize ConsensusManager
    this.consensusManager = null;
    
    this.init();
  }

  async init() {
    this.setMaxListeners(SECURITY_CONFIG.KERNEL_BUS.MAX_LISTENERS_PER_EVENT);
    this.on('error', this.handleError.bind(this));
    
    // Initialize TrustContext if not in browser
    if (!isBrowser) {
      try {
        this.trustContext = getTrustContext();
        console.log('🔒 KernelBus: TrustContext initialized');
      } catch (error) {
        console.warn('⚠️ KernelBus: Failed to initialize TrustContext:', error.message);
        this.securityEnabled = false;
      }
    }
    
    // Initialize ConsensusManager
    try {
      this.consensusManager = new ConsensusManager({
        timeoutMs: 1000, // 1 seconde timeout strict
        enableTrustContext: this.securityEnabled
      });
      
      // Écouter les événements de consensus
      this.consensusManager.on('consensusReached', this.handleConsensusReached.bind(this));
      this.consensusManager.on('consensusTimeout', this.handleConsensusTimeout.bind(this));
      
      console.log('🔒 KernelBus: ConsensusManager initialized');
    } catch (error) {
      console.warn('⚠️ KernelBus: Failed to initialize ConsensusManager:', error.message);
    }
    
    // Monitoring des performances
    if (isBrowser) {
      setInterval(() => {
        this.emit('prism:core:performanceMetrics', {
          timestamp: Date.now(),
          metrics: this.metrics,
          priorityQueueMetrics: this.priorityQueue.getMetrics(),
          consensusMetrics: this.consensusManager ? this.consensusManager.getMetrics() : null,
          memory: window.performance.memory ? {
            usedJSHeapSize: window.performance.memory.usedJSHeapSize,
            totalJSHeapSize: window.performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
          } : null,
          cpu: null // CPU usage not available in browser
        });
      }, 1000);
    }
  }

  handleError(error) {
    console.error('KernelBus Error:', error);
    this.metrics.lastError = {
      message: error.message,
      timestamp: Date.now(),
      stack: error.stack
    };
    this.metrics.failedEvents++;
    this.emit('prism:core:failure', {
      error: error.message,
      timestamp: Date.now(),
      stack: error.stack
    });
  }

  /**
   * Détermine la priorité d'un événement
   * @param {string} eventType - Type d'événement
   * @param {Object} payload - Données de l'événement
   * @returns {number} Niveau de priorité
   */
  determineEventPriority(eventType, payload) {
    // Événements de sécurité = priorité critique
    if (eventType.includes('security') || eventType.includes('critical')) {
      return Priority.CRITICAL;
    }
    
    // Événements système importants = priorité haute
    if (eventType.includes('system') || eventType.includes('error') || 
        eventType.includes('failure') || eventType.includes('emergency')) {
      return Priority.HIGH;
    }
    
    // Vérifier le payload pour des indicateurs de priorité
    if (payload && payload.priority) {
      switch (payload.priority.toLowerCase()) {
        case 'critical':
          return Priority.CRITICAL;
        case 'high':
          return Priority.HIGH;
        default:
          return Priority.NORMAL;
      }
    }
    
    return Priority.NORMAL;
  }

  /**
   * Vérifie si un événement nécessite un consensus
   * @param {string} eventType - Type d'événement
   * @param {Object} payload - Données de l'événement
   * @returns {boolean} True si consensus requis
   */
  requiresConsensus(eventType, payload) {
    // Événements critiques nécessitent un consensus
    if (eventType.includes('critical') || eventType.includes('security')) {
      return true;
    }
    
    // Événements de modification système
    if (eventType.includes('self_improvement') || eventType.includes('system_modification')) {
      return true;
    }
    
    // Vérifier le payload
    if (payload && payload.requiresConsensus === true) {
      return true;
    }
    
    return false;
  }

  /**
   * Gère les résultats de consensus
   * @param {Object} consensusResult - Résultat du consensus
   */
  handleConsensusReached(consensusResult) {
    const { proposalId, status, votes, decisionTime } = consensusResult;
    
    if (status === ConsensusStatus.APPROVED) {
      this.metrics.consensusApprovals++;
      console.log(`✅ Consensus APPROVED for proposal ${proposalId} in ${decisionTime}ms`);
    } else if (status === ConsensusStatus.REJECTED) {
      this.metrics.consensusRejections++;
      console.log(`❌ Consensus REJECTED for proposal ${proposalId} in ${decisionTime}ms`);
    }
    
    // Émettre l'événement de consensus pour notification
    this.emit('prism:consensus:decision', consensusResult);
  }

  /**
   * Gère les timeouts de consensus
   * @param {Object} timeoutResult - Résultat du timeout
   */
  handleConsensusTimeout(timeoutResult) {
    this.metrics.consensusTimeouts++;
    console.warn(`⏰ Consensus TIMEOUT for proposal ${timeoutResult.proposalId}`);
    
    // Déclencher TrustContext pour intervention humaine
    if (this.trustContext) {
      this.trustContext.requireHumanApproval(
        'Consensus timeout - human intervention required',
        'HIGH',
        timeoutResult.proposal,
        { reason: 'Consensus timeout exceeded 1 second' }
      );
    }
    
    this.emit('prism:consensus:timeout', timeoutResult);
  }

  /**
   * Vérifie si un événement nécessite une approbation TrustContext
   * @param {string} eventType - Type d'événement
   * @param {Object} payload - Données de l'événement
   * @returns {Promise<boolean>} True si l'événement peut être traité
   */
  async verifyTrustContext(eventType, payload) {
    if (!this.securityEnabled || !this.trustContext) {
      return true; // Pas de vérification si sécurité désactivée
    }

    this.metrics.securityChecks++;

    // Vérifier si l'événement est critique
    if (!SECURITY_UTILS.isCriticalEvent(eventType)) {
      return true; // Événement non critique, pas de vérification nécessaire
    }

    // Déterminer le niveau de criticité
    const criticalityLevel = SECURITY_UTILS.getCriticalityLevel(eventType);
    
    // Vérifier si une approbation humaine est requise
    if (!this.trustContext.requiresHumanApproval(eventType, criticalityLevel, payload)) {
      return true; // Pas d'approbation requise
    }

    // Vérifier si une approbation existe déjà
    const approvalToken = payload.approvalToken;
    if (approvalToken) {
      const approval = this.trustContext.checkApproval(approvalToken);
      if (approval.approved) {
        console.log(`✅ Critical event ${eventType} approved by TrustContext`);
        return true;
      } else {
        console.warn(`🚫 Critical event ${eventType} not approved:`, approval.message);
        this.metrics.blockedEvents++;
        return false;
      }
    }

    // Demander une approbation humaine
    try {
      const token = await this.trustContext.requireHumanApproval(
        eventType,
        criticalityLevel,
        payload,
        { requestedBy: 'KernelBus', timestamp: Date.now() }
      );

      console.log(`🔐 Critical event ${eventType} requires human approval. Token: ${token}`);
      
      // Émettre un événement pour notifier qu'une approbation est requise
      this.emit('prism:security:approval_required', {
        eventType,
        token,
        criticalityLevel,
        timestamp: Date.now()
      });

      this.metrics.blockedEvents++;
      return false; // Bloquer l'événement en attendant l'approbation
    } catch (error) {
      console.error('🚨 Failed to request human approval:', error);
      this.metrics.blockedEvents++;
      return false;
    }
  }

  async publish(eventType, payload) {
    if (!eventType.startsWith(this.PREFIX)) {
      eventType = this.PREFIX + eventType;
    }
    
    const startTime = performance.now();
    
    try {
      // Vérifier la charge du système
      if (this.priorityQueue.getSize() > SECURITY_CONFIG.KERNEL_BUS.MAX_QUEUE_SIZE) {
        throw new Error('Priority queue overflow');
      }

      // Déterminer la priorité de l'événement
      const priority = this.determineEventPriority(eventType, payload);
      
      // Vérifier si l'événement nécessite un consensus
      if (this.requiresConsensus(eventType, payload) && this.consensusManager) {
        const decisionHash = crypto.createHash('sha256')
          .update(JSON.stringify({ eventType, payload, timestamp: Date.now() }))
          .digest('hex');
        
        this.metrics.consensusRequests++;
        
        try {
          const proposalId = await this.consensusManager.propose(
            decisionHash, 
            { eventType, payload, priority },
            this.getDecisionType(eventType)
          );
          
          console.log(`🔒 Event ${eventType} requires consensus. Proposal ID: ${proposalId}`);
          
          // Attendre le résultat du consensus avec timeout
          const consensusResult = await this.waitForConsensus(proposalId);
          
          if (consensusResult.status !== ConsensusStatus.APPROVED) {
            throw new Error(`Event ${eventType} rejected by consensus: ${consensusResult.status}`);
          }
          
        } catch (error) {
          console.error(`🚫 Consensus failed for event ${eventType}:`, error);
          throw error;
        }
      }

      // Vérification TrustContext pour les événements critiques
      const trustVerified = await this.verifyTrustContext(eventType, payload);
      if (!trustVerified) {
        throw new Error(`Event ${eventType} blocked by TrustContext - human approval required`);
      }
      
      // Ajouter à la file de priorité
      this.priorityQueue.enqueue({ type: eventType, payload }, priority);
      
      // Traiter la file d'attente si nécessaire
      if (!this.isProcessing) {
        await this.processQueue();
      }
      
      this.metrics.publishedEvents++;
      const latency = performance.now() - startTime;
      this.metrics.eventLatencies.push(latency);
      
      // Garder seulement les 1000 dernières latences
      if (this.metrics.eventLatencies.length > 1000) {
        this.metrics.eventLatencies.shift();
      }
      
      return Promise.resolve();
    } catch (error) {
      this.handleError(error);
      return Promise.reject(error);
    }
  }

  /**
   * Détermine le type de décision pour le consensus
   * @param {string} eventType - Type d'événement
   * @returns {string} Type de décision
   */
  getDecisionType(eventType) {
    if (eventType.includes('security')) {
      return DecisionType.SECURITY;
    }
    if (eventType.includes('self_improvement')) {
      return DecisionType.SELF_IMPROVEMENT;
    }
    if (eventType.includes('system_modification')) {
      return DecisionType.SYSTEM_MODIFICATION;
    }
    if (eventType.includes('data_access')) {
      return DecisionType.DATA_ACCESS;
    }
    return DecisionType.CRITICAL;
  }

  /**
   * Attend le résultat d'un consensus
   * @param {string} proposalId - ID de la proposition
   * @returns {Promise<Object>} Résultat du consensus
   */
  async waitForConsensus(proposalId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Consensus timeout'));
      }, 1100); // Légèrement plus que le timeout du ConsensusManager

      const handleConsensus = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          resolve(result);
        }
      };

      const handleTimeout = (result) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timeout);
          this.consensusManager.removeListener('consensusReached', handleConsensus);
          this.consensusManager.removeListener('consensusTimeout', handleTimeout);
          reject(new Error('Consensus timeout'));
        }
      };

      this.consensusManager.on('consensusReached', handleConsensus);
      this.consensusManager.on('consensusTimeout', handleTimeout);
    });
  }

  async processQueue() {
    if (this.isProcessing || this.priorityQueue.isEmpty()) return;
    
    this.isProcessing = true;
    const startTime = performance.now();
    
    try {
      // Traiter les événements par ordre de priorité
      while (!this.priorityQueue.isEmpty()) {
        const batchSize = Math.min(100, this.priorityQueue.getSize());
        const batch = [];
        
        // Extraire un lot d'événements de la file de priorité
        for (let i = 0; i < batchSize; i++) {
          const event = this.priorityQueue.dequeue();
          if (event) {
            batch.push(event);
          }
        }
        
        if (batch.length === 0) break;
        
        // Timeout pour le traitement du batch
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Batch processing timeout')), 
                    SECURITY_CONFIG.KERNEL_BUS.EVENT_PROCESSING_TIMEOUT_MS);
        });

        const processingPromise = Promise.all(
          batch.map(({ type, payload }) => {
            try {
              this.emit(type, payload);
            } catch (error) {
              this.handleError(error);
            }
          })
        );

        await Promise.race([processingPromise, timeoutPromise]);
      }
    } catch (error) {
      console.error('🚨 Queue processing failed:', error);
      this.handleError(error);
    } finally {
      this.isProcessing = false;
      this.metrics.processingTime = performance.now() - startTime;
    }
  }

  subscribe(eventType, handler) {
    if (!eventType.startsWith(this.PREFIX)) {
      eventType = this.PREFIX + eventType;
    }
    this.on(eventType, handler);
    this.subscriptions.set(handler, eventType);
    return () => this.unsubscribe(handler);
  }

  unsubscribe(handler) {
    const eventType = this.subscriptions.get(handler);
    if (eventType) {
      this.removeListener(eventType, handler);
      this.subscriptions.delete(handler);
    }
  }

  clear() {
    this.removeAllListeners();
    this.subscriptions.clear();
    this.priorityQueue.clear();
    this.isProcessing = false;
    this.metrics = {
      publishedEvents: 0,
      failedEvents: 0,
      processingTime: 0,
      lastError: null,
      eventLatencies: [],
      securityChecks: 0,
      blockedEvents: 0,
      consensusRequests: 0,
      consensusApprovals: 0,
      consensusRejections: 0,
      consensusTimeouts: 0
    };
  }

  // Optimized batch event emission with backpressure
  async publishBatch(events) {
    const results = [];
    for (const event of events) {
      try {
        await this.publish(event.type, event.payload);
        results.push({ success: true, event });
      } catch (error) {
        results.push({ success: false, event, error });
      }
    }
    return results;
  }

  /**
   * Approuve un événement critique en attente
   * @param {string} approvalToken - Token d'approbation
   * @param {string} supervisorId - ID du superviseur
   * @param {string} supervisorSignature - Signature du superviseur
   * @returns {boolean} True si approuvé avec succès
   */
  approveEvent(approvalToken, supervisorId, supervisorSignature) {
    if (!this.trustContext) {
      console.warn('⚠️ TrustContext not available for event approval');
      return false;
    }

    const approved = this.trustContext.approveDecision(approvalToken, supervisorId, supervisorSignature);
    
    if (approved) {
      console.log(`✅ Event approved by supervisor ${supervisorId}`);
      this.emit('prism:security:event_approved', {
        token: approvalToken,
        supervisorId,
        timestamp: Date.now()
      });
    }

    return approved;
  }

  /**
   * Rejette un événement critique en attente
   * @param {string} approvalToken - Token d'approbation
   * @param {string} supervisorId - ID du superviseur
   * @param {string} supervisorSignature - Signature du superviseur
   * @param {string} reason - Raison du rejet
   * @returns {boolean} True si rejeté avec succès
   */
  rejectEvent(approvalToken, supervisorId, supervisorSignature, reason) {
    if (!this.trustContext) {
      console.warn('⚠️ TrustContext not available for event rejection');
      return false;
    }

    const rejected = this.trustContext.rejectDecision(approvalToken, supervisorId, supervisorSignature, reason);
    
    if (rejected) {
      console.log(`❌ Event rejected by supervisor ${supervisorId}: ${reason}`);
      this.emit('prism:security:event_rejected', {
        token: approvalToken,
        supervisorId,
        reason,
        timestamp: Date.now()
      });
    }

    return rejected;
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageLatency: this.metrics.eventLatencies.length > 0
        ? this.metrics.eventLatencies.reduce((a, b) => a + b, 0) / this.metrics.eventLatencies.length
        : 0,
      queueLength: this.priorityQueue.getSize(),
      priorityQueueMetrics: this.priorityQueue.getMetrics(),
      consensusMetrics: this.consensusManager ? this.consensusManager.getMetrics() : null,
      isProcessing: this.isProcessing,
      securityEnabled: this.securityEnabled,
      trustContextActive: !!this.trustContext,
      consensusManagerActive: !!this.consensusManager
    };
  }

  /**
   * Obtient les métriques de sécurité
   * @returns {Object} Métriques de sécurité
   */
  getSecurityMetrics() {
    const baseMetrics = {
      securityChecks: this.metrics.securityChecks,
      blockedEvents: this.metrics.blockedEvents,
      consensusRequests: this.metrics.consensusRequests,
      consensusApprovals: this.metrics.consensusApprovals,
      consensusRejections: this.metrics.consensusRejections,
      consensusTimeouts: this.metrics.consensusTimeouts,
      consensusSuccessRate: this.metrics.consensusRequests > 0 ? 
        (this.metrics.consensusApprovals + this.metrics.consensusRejections) / this.metrics.consensusRequests : 0,
      securityEnabled: this.securityEnabled,
      trustContextActive: !!this.trustContext,
      consensusManagerActive: !!this.consensusManager
    };

    if (this.trustContext) {
      return {
        ...baseMetrics,
        ...this.trustContext.getSecurityMetrics()
      };
    }

    return baseMetrics;
  }

  /**
   * Nettoie les ressources du KernelBus
   */
  cleanup() {
    if (this.consensusManager) {
      this.consensusManager.cleanup();
    }
    this.clear();
  }
}

export default KernelBus; 