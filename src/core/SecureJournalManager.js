/**
 * PRISM Secure Journal Manager
 * Système de journalisation HMAC signée avec reprise de crash ≤ 50ms
 * Élément technique brevetable C : Journal HMAC signé + reprise crash ≤ 50 ms
 */

import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  validateJournalEntryInput,
  validateJournalEntryOutput
} from '../security/contracts/journal.js';

/**
 * Types d'événements journalisés
 */
export const JournalEventType = {
  CONSENSUS_DECISION: 'consensus_decision',
  MODEL_SELECTION: 'model_selection',
  PERFORMANCE_ADAPTATION: 'performance_adaptation',
  SECURITY_ALERT: 'security_alert',
  SYSTEM_STATE_CHANGE: 'system_state_change',
  USER_INTERACTION: 'user_interaction',
  ERROR_RECOVERY: 'error_recovery'
};

/**
 * Structure d'une entrée de journal
 */
class JournalEntry {
  constructor(eventType, payload, metadata = {}) {
    this.id = crypto.randomUUID();
    this.timestamp = Date.now();
    this.eventType = eventType;
    this.payload = payload;
    this.metadata = {
      version: '1.0',
      source: 'prism-core',
      ...metadata
    };
    this.sequence = 0; // Sera assigné par le manager
    this.hash = this.calculateHash();
    this.signature = null; // Sera assigné après signature HMAC
  }

  /**
   * Calcule le hash de l'entrée (sans la signature)
   */
  calculateHash() {
    const data = {
      id: this.id,
      timestamp: this.timestamp,
      eventType: this.eventType,
      payload: this.payload,
      metadata: this.metadata,
      sequence: this.sequence
    };
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Sérialise l'entrée pour stockage
   */
  serialize() {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp,
      eventType: this.eventType,
      payload: this.payload,
      metadata: this.metadata,
      sequence: this.sequence,
      hash: this.hash,
      signature: this.signature
    });
  }

  /**
   * Désérialise une entrée depuis JSON
   */
  static deserialize(jsonString) {
    const data = JSON.parse(jsonString);
    const entry = new JournalEntry(data.eventType, data.payload, data.metadata);
    entry.id = data.id;
    entry.timestamp = data.timestamp;
    entry.sequence = data.sequence;
    entry.hash = data.hash;
    entry.signature = data.signature;
    return entry;
  }
}

/**
 * Gestionnaire de journal sécurisé avec signatures HMAC
 * et capacité de reprise rapide après crash
 */
export class SecureJournalManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      hmacSecret: config.hmacSecret || crypto.randomBytes(32).toString('hex'),
      journalPath: config.journalPath || './data/journal',
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxRecoveryTime: config.maxRecoveryTime || 50, // 50ms max recovery time
      checksumInterval: config.checksumInterval || 1000, // Checksum every 1000 entries
      backupInterval: config.backupInterval || 60000, // Backup every minute
      compression: config.compression || false,
      ...config
    };
    
    // État du journal
    this.currentSequence = 0;
    this.currentFile = null;
    this.currentFileSize = 0;
    this.lastChecksum = null;
    this.entries = []; // Buffer en mémoire pour reprise rapide
    this.isRecovering = false;
    this.recoveryStartTime = 0;
    
    // Métriques de performance
    this.metrics = {
      totalEntries: 0,
      totalRecoveries: 0,
      avgRecoveryTime: 0,
      maxRecoveryTime: 0,
      lastRecoveryTime: 0,
      signatureFailures: 0,
      integrityCheckFailures: 0,
      lastBackupTime: 0
    };
    
    // Initialisation
    this.initializeJournal();
  }

  /**
   * Initialise le système de journal
   */
  async initializeJournal() {
    try {
      // Créer le répertoire s'il n'existe pas
      await fs.mkdir(this.config.journalPath, { recursive: true });
      
      // Effectuer la récupération rapide si nécessaire
      await this.performFastRecovery();
      
      // Démarrer les tâches de maintenance
      this.startMaintenanceTasks();
      
      this.emit('journalInitialized', {
        currentSequence: this.currentSequence,
        recoveryTime: this.metrics.lastRecoveryTime,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.emit('journalError', {
        error: error.message,
        phase: 'initialization',
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Effectue une récupération rapide après crash (≤ 50ms)
   */
  async performFastRecovery() {
    const recoveryStart = Date.now();
    this.recoveryStartTime = recoveryStart;
    this.isRecovering = true;
    
    try {
      // 1. Charger le dernier état depuis le fichier de checkpoint (≤ 10ms)
      const checkpointState = await this.loadCheckpoint();
      
      // 2. Récupérer les entrées depuis le dernier checkpoint (≤ 20ms)
      const pendingEntries = await this.loadPendingEntries(checkpointState);
      
      // 3. Valider l'intégrité des entrées récupérées (≤ 15ms)
      const validatedEntries = await this.validateEntries(pendingEntries);
      
      // 4. Reconstruire l'état en mémoire (≤ 5ms)
      await this.rebuildMemoryState(validatedEntries);
      
      const recoveryTime = Date.now() - recoveryStart;
      
      // Vérifier que la récupération respecte la contrainte de temps
      if (recoveryTime > this.config.maxRecoveryTime) {
        console.warn(`⚠️ Recovery time exceeded target: ${recoveryTime}ms > ${this.config.maxRecoveryTime}ms`);
      }
      
      // Mettre à jour les métriques
      this.updateRecoveryMetrics(recoveryTime);
      
      this.emit('recoveryCompleted', {
        recoveryTime,
        entriesRecovered: validatedEntries.length,
        currentSequence: this.currentSequence,
        success: true,
        timestamp: Date.now()
      });
      
    } catch (error) {
      const recoveryTime = Date.now() - recoveryStart;
      this.updateRecoveryMetrics(recoveryTime, false);
      
      this.emit('recoveryFailed', {
        error: error.message,
        recoveryTime,
        timestamp: Date.now()
      });
      
      throw error;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Charge le dernier checkpoint
   */
  async loadCheckpoint() {
    const checkpointPath = path.join(this.config.journalPath, 'checkpoint.json');
    
    try {
      const checkpointData = await fs.readFile(checkpointPath, 'utf8');
      return JSON.parse(checkpointData);
    } catch (_error) {
      // Pas de checkpoint existant, commencer depuis le début
      return {
        sequence: 0,
        timestamp: Date.now(),
        lastFile: null,
        checksum: null
      };
    }
  }

  /**
   * Charge les entrées en attente depuis le dernier checkpoint
   */
  async loadPendingEntries(checkpointState) {
    const entries = [];
    const journalFiles = await this.getJournalFiles();
    
    for (const filename of journalFiles) {
      if (checkpointState.lastFile && filename <= checkpointState.lastFile) {
        continue; // Fichier déjà traité dans le checkpoint
      }
      
      const filePath = path.join(this.config.journalPath, filename);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JournalEntry.deserialize(line);
          if (entry.sequence > checkpointState.sequence) {
            entries.push(entry);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse journal entry: ${error.message}`);
        }
      }
    }
    
    return entries.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Valide l'intégrité des entrées récupérées
   */
  async validateEntries(entries) {
    const validEntries = [];
    
    for (const entry of entries) {
      // Vérifier le hash
      const expectedHash = entry.calculateHash();
      if (entry.hash !== expectedHash) {
        this.metrics.integrityCheckFailures++;
        console.warn(`⚠️ Hash mismatch for entry ${entry.id}`);
        continue;
      }
      
      // Vérifier la signature HMAC
      if (!this.verifySignature(entry)) {
        this.metrics.signatureFailures++;
        console.warn(`⚠️ Signature verification failed for entry ${entry.id}`);
        continue;
      }
      
      validEntries.push(entry);
    }
    
    return validEntries;
  }

  /**
   * Reconstruit l'état en mémoire
   */
  async rebuildMemoryState(entries) {
    this.entries = entries;
    this.currentSequence = entries.length > 0 ? 
      Math.max(...entries.map(e => e.sequence)) : 0;
    
    // Mettre à jour les métriques
    this.metrics.totalEntries = this.currentSequence;
  }

  /**
   * Ajoute une entrée au journal avec signature HMAC
   */
  async addEntry(eventType, payload, metadata = {}) {
    if (this.isRecovering) {
      throw new Error('Journal is recovering, cannot add entries');
    }
    
    // VALIDATION FAIL-CLOSED: Vérifier que l'input est conforme au schéma
    let validatedInput;
    try {
      validatedInput = validateJournalEntryInput({
        eventType,
        payload,
        metadata
      });
    } catch (error) {
      // Log structuré du rejet
      const logEntry = {
        timestamp: Date.now(),
        event: 'schema_validation_failed',
        module: 'SecureJournalManager.addEntry',
        error: error.message,
        eventType
      };
      console.error('🚫 FAIL-CLOSED: Journal entry rejected (schema validation):', logEntry);
      throw error; // Fail-closed: rejeter explicitement
    }
    
    try {
      // Créer l'entrée avec données validées
      const entry = new JournalEntry(
        validatedInput.eventType,
        validatedInput.payload,
        validatedInput.metadata || {}
      );
      entry.sequence = ++this.currentSequence;
      entry.hash = entry.calculateHash();
      
      // Signer avec HMAC
      entry.signature = this.signEntry(entry);
      
      // Ajouter au buffer mémoire
      this.entries.push(entry);
      
      // Persister sur disque
      await this.persistEntry(entry);
      
      // Mettre à jour les métriques
      this.metrics.totalEntries++;
      
      this.emit('entryAdded', {
        entryId: entry.id,
        eventType: entry.eventType,
        sequence: entry.sequence,
        timestamp: entry.timestamp
      });
      
      // VALIDATION FAIL-CLOSED: Vérifier que la sortie est conforme
      try {
        const output = {
          id: entry.id,
          timestamp: entry.timestamp,
          eventType: entry.eventType,
          payload: entry.payload,
          metadata: entry.metadata,
          sequence: entry.sequence,
          hash: entry.hash,
          signature: entry.signature
        };
        validateJournalEntryOutput(output);
      } catch (error) {
        // Log mais ne pas bloquer (sortie déjà générée)
        console.warn('⚠️ Journal entry output validation warning:', error.message);
      }
      
      return entry.id;
      
    } catch (error) {
      this.emit('entryError', {
        error: error.message,
        eventType,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Signe une entrée avec HMAC-SHA256
   */
  signEntry(entry) {
    const data = `${entry.id}:${entry.timestamp}:${entry.hash}:${entry.sequence}`;
    return crypto.createHmac('sha256', this.config.hmacSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Vérifie la signature HMAC d'une entrée
   */
  verifySignature(entry) {
    const expectedSignature = this.signEntry(entry);
    return crypto.timingSafeEqual(
      Buffer.from(entry.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Persiste une entrée sur disque
   */
  async persistEntry(entry) {
    // Créer un nouveau fichier si nécessaire
    if (!this.currentFile || this.currentFileSize >= this.config.maxFileSize) {
      await this.createNewJournalFile();
    }
    
    const serialized = `${entry.serialize()  }\n`;
    await fs.appendFile(this.currentFile, serialized);
    this.currentFileSize += serialized.length;
  }

  /**
   * Crée un nouveau fichier de journal
   */
  async createNewJournalFile() {
    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    const filename = `journal-${timestamp}.log`;
    this.currentFile = path.join(this.config.journalPath, filename);
    this.currentFileSize = 0;
  }

  /**
   * Obtient la liste des fichiers de journal
   */
  async getJournalFiles() {
    const files = await fs.readdir(this.config.journalPath);
    return files
      .filter(file => file.startsWith('journal-') && file.endsWith('.log'))
      .sort();
  }

  /**
   * Recherche des entrées par critères
   */
  async queryEntries(criteria = {}) {
    let filteredEntries = [...this.entries];
    
    if (criteria.eventType) {
      filteredEntries = filteredEntries.filter(e => e.eventType === criteria.eventType);
    }
    
    if (criteria.fromTimestamp) {
      filteredEntries = filteredEntries.filter(e => e.timestamp >= criteria.fromTimestamp);
    }
    
    if (criteria.toTimestamp) {
      filteredEntries = filteredEntries.filter(e => e.timestamp <= criteria.toTimestamp);
    }
    
    if (criteria.limit) {
      filteredEntries = filteredEntries.slice(-criteria.limit);
    }
    
    return filteredEntries;
  }

  /**
   * Crée un checkpoint pour accélérer les futures récupérations
   */
  async createCheckpoint() {
    const checkpointData = {
      sequence: this.currentSequence,
      timestamp: Date.now(),
      lastFile: this.currentFile ? path.basename(this.currentFile) : null,
      checksum: this.calculateChecksum(),
      entries: this.entries.length
    };
    
    const checkpointPath = path.join(this.config.journalPath, 'checkpoint.json');
    await fs.writeFile(checkpointPath, JSON.stringify(checkpointData, null, 2));
    
    this.emit('checkpointCreated', checkpointData);
  }

  /**
   * Calcule un checksum des entrées actuelles
   */
  calculateChecksum() {
    const hashes = this.entries.map(e => e.hash).join('');
    return crypto.createHash('sha256').update(hashes).digest('hex');
  }

  /**
   * Met à jour les métriques de récupération
   */
  updateRecoveryMetrics(recoveryTime, _success = true) {
    this.metrics.totalRecoveries++;
    this.metrics.lastRecoveryTime = recoveryTime;
    
    if (recoveryTime > this.metrics.maxRecoveryTime) {
      this.metrics.maxRecoveryTime = recoveryTime;
    }
    
    // Calculer la moyenne mobile
    this.metrics.avgRecoveryTime = 
      (this.metrics.avgRecoveryTime * (this.metrics.totalRecoveries - 1) + recoveryTime) / 
      this.metrics.totalRecoveries;
  }

  /**
   * Démarre les tâches de maintenance
   */
  startMaintenanceTasks() {
    // Checkpoint automatique
    setInterval(() => {
      this.createCheckpoint().catch(error => {
        console.warn(`⚠️ Checkpoint failed: ${error.message}`);
      });
    }, this.config.backupInterval);
    
    // Validation d'intégrité périodique
    setInterval(() => {
      this.validateIntegrity().catch(error => {
        console.warn(`⚠️ Integrity check failed: ${error.message}`);
      });
    }, this.config.checksumInterval * 10);
  }

  /**
   * Valide l'intégrité complète du journal
   */
  async validateIntegrity() {
    let issues = 0;
    
    for (const entry of this.entries) {
      // Vérifier le hash
      const expectedHash = entry.calculateHash();
      if (entry.hash !== expectedHash) {
        issues++;
        console.warn(`⚠️ Integrity issue: hash mismatch for entry ${entry.id}`);
      }
      
      // Vérifier la signature
      if (!this.verifySignature(entry)) {
        issues++;
        console.warn(`⚠️ Integrity issue: signature invalid for entry ${entry.id}`);
      }
    }
    
    this.emit('integrityCheck', {
      totalEntries: this.entries.length,
      issues,
      valid: issues === 0,
      timestamp: Date.now()
    });
    
    return issues === 0;
  }

  /**
   * Obtient les métriques du journal
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentSequence: this.currentSequence,
      entriesInMemory: this.entries.length,
      isRecovering: this.isRecovering,
      journalPath: this.config.journalPath,
      timestamp: Date.now()
    };
  }

  /**
   * Exporte une partie du journal pour audit
   */
  async exportJournal(criteria = {}) {
    const entries = await this.queryEntries(criteria);
    
    return {
      exportTimestamp: Date.now(),
      criteria,
      totalEntries: entries.length,
      entries: entries.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        eventType: entry.eventType,
        payload: entry.payload,
        sequence: entry.sequence,
        hash: entry.hash,
        signature: entry.signature,
        verified: this.verifySignature(entry)
      }))
    };
  }

  /**
   * Nettoie les ressources
   */
  async cleanup() {
    // Créer un dernier checkpoint
    await this.createCheckpoint();
    
    // Nettoyer les timers
    clearInterval(this.checkpointTimer);
    clearInterval(this.integrityTimer);
    
    this.removeAllListeners();
  }

  /**
   * Écrit un snapshot signé contenant les poids adaptatifs
   * @param {Object} data - Données à sauvegarder
   * @returns {Object} Snapshot signé { data, timestamp, signature }
   */
  async writeSnapshot(data) {
    const snapshot = {
      data,
      timestamp: Date.now()
    };
    const serialized = `${JSON.stringify(snapshot.data)  }|${  snapshot.timestamp}`;
    snapshot.signature = crypto.createHmac('sha256', this.config.hmacSecret)
      .update(serialized)
      .digest('hex');

    // Stocker dans le journal comme nouvelle entrée
    await this.addEntry('weight_snapshot', snapshot, { component: 'AdaptiveWeightingEngine' });

    return snapshot;
  }

  /**
   * Vérifie la signature HMAC d'un snapshot
   * @param {Object} snapshot - Snapshot à vérifier
   * @returns {boolean} true si valide, sinon false
   */
  verifySnapshot(snapshot) {
    if (!snapshot || !snapshot.signature) return false;
    const serialized = `${JSON.stringify(snapshot.data)  }|${  snapshot.timestamp}`;
    const expected = crypto.createHmac('sha256', this.config.hmacSecret)
      .update(serialized)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(snapshot.signature, 'hex'));
    } catch (_err) {
      // crypto.timingSafeEqual may throw if buffer lengths differ
      return false;
    }
  }
}

export default SecureJournalManager; 