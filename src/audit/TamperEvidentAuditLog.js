/**
 * @fileoverview Tamper-Evident Audit Log - Append-only log with hash-chain and Ed25519 signatures
 * @module src/audit/TamperEvidentAuditLog
 * 
 * Implémente un audit log append-only avec:
 * - Hash-chain (prevHash → hash) pour détecter modification/suppression/insertion/reorder
 * - Signature Ed25519 pour non-répudiation
 * - Rotation par taille/jour
 * - Vérification complète (verify)
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Record format pour audit log
 * @typedef {Object} AuditRecord
 * @property {number} version - Version du format (1)
 * @property {number} seq - Numéro de séquence (monotone)
 * @property {string} ts - Timestamp ISO8601
 * @property {string} correlationId - ID de corrélation
 * @property {string} eventType - Type d'événement
 * @property {string} payloadDigest - Digest SHA-256 du payload (hex)
 * @property {string} prevHash - Hash du record précédent (GENESIS si premier)
 * @property {string} hash - Hash SHA-256 du record canonique (sans hash/sig)
 * @property {string} pubKeyId - Identifiant de la clé publique
 * @property {string} sig - Signature Ed25519 (hex)
 */

/**
 * Classe TamperEvidentAuditLog - Audit log append-only tamper-evident
 */
export class TamperEvidentAuditLog extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      logDir: config.logDir || path.join(process.cwd(), 'data', 'audit'),
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      rotationStrategy: config.rotationStrategy || 'size', // 'size' | 'daily'
      keyDir: config.keyDir || path.join(process.cwd(), 'keys'),
      pubKeyId: config.pubKeyId || 'default',
      ...config
    };
    
    // État
    this.currentFile = null;
    this.currentSeq = 0;
    this.lastHash = 'GENESIS'; // Hash du dernier record
    this.privateKey = null;
    this.publicKey = null;
    this.pubKeyId = this.config.pubKeyId;
    
    // Cache pour performance
    this.lastRecordCache = null;
    
    // Initialisation
    this._initialized = false;
  }
  
  /**
   * Initialise le log (charge clés, vérifie dernier record)
   */
  async initialize() {
    if (this._initialized) return;
    
    try {
      // Créer répertoires
      await fs.mkdir(this.config.logDir, { recursive: true });
      await fs.mkdir(this.config.keyDir, { recursive: true });
      
      // Charger ou générer clés Ed25519
      await this._loadOrGenerateKeys();
      
      // Charger l'état depuis le dernier fichier
      await this._loadLastState();
      
      this._initialized = true;
      this.emit('initialized', {
        currentSeq: this.currentSeq,
        lastHash: this.lastHash,
        pubKeyId: this.pubKeyId
      });
    } catch (error) {
      console.error('[TamperEvidentAuditLog] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Charge ou génère les clés Ed25519
   * @private
   */
  async _loadOrGenerateKeys() {
    const privateKeyPath = path.join(this.config.keyDir, `${this.pubKeyId}.key`);
    const publicKeyPath = path.join(this.config.keyDir, `${this.pubKeyId}.pub`);
    
    try {
      // Charger les clés existantes (format PEM)
      const privateKeyPem = await fs.readFile(privateKeyPath, 'utf8');
      const publicKeyPem = await fs.readFile(publicKeyPath, 'utf8');
      
      // Charger les clés en format PEM
      this.privateKey = privateKeyPem;
      this.publicKey = publicKeyPem;
      
    } catch (_error) {
      // Générer nouvelles clés Ed25519
      console.log('[TamperEvidentAuditLog] Generating new Ed25519 keypair...');
      
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      
      // Sauvegarder les clés (format PEM)
      await fs.writeFile(privateKeyPath, privateKey, { mode: 0o600 });
      await fs.writeFile(publicKeyPath, publicKey, { mode: 0o644 });
      
      console.log('[TamperEvidentAuditLog] Ed25519 keys generated and saved');
    }
  }
  
  /**
   * Charge l'état depuis le dernier fichier de log
   * @private
   */
  async _loadLastState() {
    try {
      const files = await this._getLogFiles();
      if (files.length === 0) {
        this.currentSeq = 0;
        this.lastHash = 'GENESIS';
        this.currentFile = this._getCurrentLogFilePath();
        return;
      }
      
      // Lire le dernier fichier pour trouver le dernier record
      const lastFile = files[files.length - 1];
      const lastFilePath = path.join(this.config.logDir, lastFile);
      const content = await fs.readFile(lastFilePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        this.currentSeq = 0;
        this.lastHash = 'GENESIS';
        this.currentFile = lastFilePath;
        return;
      }
      
      // Parser le dernier record
      const lastLine = lines[lines.length - 1];
      const lastRecord = JSON.parse(lastLine);
      
      this.currentSeq = lastRecord.seq;
      this.lastHash = lastRecord.hash;
      this.lastRecordCache = lastRecord;
      
      // Déterminer le fichier courant (même ou nouveau selon rotation)
      const fileSize = (await fs.stat(lastFilePath)).size;
      if (fileSize >= this.config.maxFileSize && this.config.rotationStrategy === 'size') {
        // Rotation nécessaire
        this.currentFile = this._getCurrentLogFilePath();
      } else {
        this.currentFile = lastFilePath;
      }
      
    } catch (error) {
      console.warn('[TamperEvidentAuditLog] Failed to load last state:', error.message);
      this.currentSeq = 0;
      this.lastHash = 'GENESIS';
      this.currentFile = this._getCurrentLogFilePath();
    }
  }
  
  /**
   * Obtient la liste des fichiers de log triés
   * @private
   */
  async _getLogFiles() {
    try {
      const files = await fs.readdir(this.config.logDir);
      return files
        .filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'))
        .sort();
    } catch (_error) {
      return [];
    }
  }
  
  /**
   * Génère le chemin du fichier de log courant
   * @private
   */
  _getCurrentLogFilePath() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `audit-${timestamp}.jsonl`;
    return path.join(this.config.logDir, filename);
  }
  
  /**
   * Canonicalise un record pour le hash (sans hash et sig)
   * @private
   */
  _canonicalizeRecord(record) {
    // Créer une copie sans hash et sig
    const canonical = {
      version: record.version,
      seq: record.seq,
      ts: record.ts,
      correlationId: record.correlationId,
      eventType: record.eventType,
      payloadDigest: record.payloadDigest,
      prevHash: record.prevHash,
      pubKeyId: record.pubKeyId
    };
    
    // JSON.stringify avec ordre stable (Object.keys triés)
    return JSON.stringify(canonical, Object.keys(canonical).sort());
  }
  
  /**
   * Calcule le hash SHA-256 d'un record canonique
   * @private
   */
  _calculateHash(canonicalRecord) {
    return crypto.createHash('sha256')
      .update(canonicalRecord, 'utf8')
      .digest('hex');
  }
  
  /**
   * Signe un message avec Ed25519
   * @private
   */
  _sign(message) {
    // Node.js Ed25519 signing
    // crypto.sign avec Ed25519 utilise null comme algorithme (Ed25519 signe directement)
    const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');
    
    try {
      // Pour Ed25519, on utilise crypto.sign avec null (pas de hash algorithm)
      // La clé privée est en format PEM
      const signature = crypto.sign(null, messageBuffer, this.privateKey);
      
      return signature.toString('hex');
    } catch (error) {
      console.error('[TamperEvidentAuditLog] Signing error:', error);
      throw new Error(`FAIL-CLOSED: Ed25519 signing failed - ${error.message}`);
    }
  }
  
  /**
   * Vérifie une signature Ed25519
   * @private
   */
  _verify(message, signature, publicKey) {
    const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'hex');
    
    try {
      // Pour Ed25519, on utilise crypto.verify avec null (pas de hash algorithm)
      // crypto.verify(algorithm, data, key, signature)
      return crypto.verify(null, messageBuffer, publicKey, signatureBuffer);
    } catch (error) {
      console.warn('[TamperEvidentAuditLog] Verification error:', error.message);
      return false;
    }
  }
  
  /**
   * Ajoute un événement au log (append-only, atomique)
   * @param {Object} event - Événement à logger
   * @param {string} event.correlationId - ID de corrélation
   * @param {string} event.eventType - Type d'événement
   * @param {Object} event.payload - Payload (sera digéré)
   * @returns {Promise<Object>} {seq, hash, signature}
   */
  async appendAuditEvent(event) {
    if (!this._initialized) {
      await this.initialize();
    }
    
    // VALIDATION FAIL-CLOSED: Vérifier les paramètres
    if (!event || !event.eventType) {
      throw new Error('FAIL-CLOSED: event and eventType required');
    }
    
    const correlationId = event.correlationId || crypto.randomUUID();
    const eventType = event.eventType;
    
    // Calculer le digest du payload
    const payloadStr = JSON.stringify(event.payload || {});
    const payloadDigest = crypto.createHash('sha256')
      .update(payloadStr, 'utf8')
      .digest('hex');
    
    // Vérifier rotation (seulement si currentFile existe déjà)
    if (this.currentFile && this.config.rotationStrategy === 'size') {
      try {
        const stats = await fs.stat(this.currentFile);
        if (stats.size >= this.config.maxFileSize) {
          // Rotation nécessaire: créer nouveau fichier mais CONSERVER lastHash pour chaîner
          this.currentFile = this._getCurrentLogFilePath();
          // NOTE: Ne PAS réinitialiser lastHash à 'GENESIS' ici
          // Le premier record du nouveau fichier doit continuer la chaîne avec prevHash = this.lastHash
        }
      } catch (_error) {
        // Fichier n'existe pas encore, c'est OK - currentFile sera utilisé pour le premier append
      }
    }
    
    // Si currentFile n'est pas défini, l'initialiser
    if (!this.currentFile) {
      this.currentFile = this._getCurrentLogFilePath();
    }
    
    // Créer le record (sans hash et sig pour l'instant)
    const record = {
      version: 1,
      seq: ++this.currentSeq,
      ts: new Date().toISOString(),
      correlationId,
      eventType,
      payloadDigest,
      prevHash: this.lastHash,
      hash: '', // Sera calculé
      pubKeyId: this.pubKeyId,
      sig: '' // Sera calculé
    };
    
    // Canonicaliser et calculer le hash
    const canonicalRecord = this._canonicalizeRecord(record);
    const hash = this._calculateHash(canonicalRecord);
    record.hash = hash;
    
    // Signer le hash (ou le record canonique)
    const messageToSign = canonicalRecord; // Signer le record canonique
    const signature = this._sign(messageToSign);
    record.sig = signature;
    
    // Écrire de manière atomique (append)
    const recordLine = `${JSON.stringify(record)  }\n`;
    
    try {
      // Append atomique (fs.appendFile est atomique sur la plupart des systèmes)
      await fs.appendFile(this.currentFile, recordLine, 'utf8');
      
      // Mettre à jour l'état
      this.lastHash = hash;
      this.lastRecordCache = record;
      
      // Émettre événement
      this.emit('recordAppended', {
        seq: record.seq,
        hash: record.hash,
        eventType: record.eventType
      });
      
      return {
        seq: record.seq,
        hash: record.hash,
        signature: record.sig
      };
      
    } catch (error) {
      // Rollback seq si échec
      this.currentSeq--;
      console.error('[TamperEvidentAuditLog] Append failed:', error);
      throw new Error(`FAIL-CLOSED: Append failed - ${error.message}`);
    }
  }
  
  /**
   * Vérifie l'intégrité du log (détecte corruption/modification/suppression/insertion/reorder)
   * @param {Object} options - Options de vérification
   * @param {number} options.from - Seq de début (optionnel)
   * @param {number} options.to - Seq de fin (optionnel)
   * @returns {Promise<Object>} {ok: boolean, failure?: {type, seq, reason}, stats: {...}}
   */
  async verifyAuditLog(options = {}) {
    const { from, to } = options;
    
    try {
      const files = await this._getLogFiles();
      if (files.length === 0) {
        return {
          ok: true,
          stats: {
            checked: 0,
            firstTs: null,
            lastTs: null
          }
        };
      }
      
      let checked = 0;
      let firstTs = null;
      let lastTs = null;
      let previousHash = 'GENESIS';
      let previousSeq = 0;
      const _currentPubKeyId = null;
      
      // Charger la clé publique (format PEM)
      const publicKeyPath = path.join(this.config.keyDir, `${this.pubKeyId}.pub`);
      let publicKey;
      try {
        publicKey = await fs.readFile(publicKeyPath, 'utf8');
      } catch (_error) {
        return {
          ok: false,
          failure: {
            type: 'PUBKEY_NOT_FOUND',
            seq: null,
            reason: `Public key not found: ${publicKeyPath}`
          },
          stats: { checked, firstTs, lastTs }
        };
      }
      
      // Lire tous les fichiers dans l'ordre
      for (const file of files) {
        const filePath = path.join(this.config.logDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          let record;
          try {
            record = JSON.parse(line);
          } catch (error) {
            return {
              ok: false,
              failure: {
                type: 'INVALID_JSON',
                seq: null,
                reason: `Invalid JSON in file ${file}: ${error.message}`
              },
              stats: { checked, firstTs, lastTs }
            };
          }
          
          // Filtrer par range si spécifié
          if (from !== undefined && record.seq < from) continue;
          if (to !== undefined && record.seq > to) break;
          
          checked++;
          
          // Vérifier séquence monotone
          if (record.seq !== previousSeq + 1 && previousSeq > 0) {
            return {
              ok: false,
              failure: {
                type: 'SEQ_GAP',
                seq: record.seq,
                reason: `Sequence gap detected: expected ${previousSeq + 1}, got ${record.seq}`
              },
              stats: { checked, firstTs, lastTs }
            };
          }
          
          // Vérifier prevHash (sauf si GENESIS ou nouveau segment)
          if (record.prevHash !== 'GENESIS' && record.prevHash !== previousHash) {
            return {
              ok: false,
              failure: {
                type: 'PREVHASH_MISMATCH',
                seq: record.seq,
                reason: `Previous hash mismatch: expected ${previousHash}, got ${record.prevHash}`
              },
              stats: { checked, firstTs, lastTs }
            };
          }
          
          // Vérifier le hash recalculé
          const canonicalRecord = this._canonicalizeRecord(record);
          const expectedHash = this._calculateHash(canonicalRecord);
          if (record.hash !== expectedHash) {
            return {
              ok: false,
              failure: {
                type: 'HASH_MISMATCH',
                seq: record.seq,
                reason: `Hash mismatch: expected ${expectedHash}, got ${record.hash}`
              },
              stats: { checked, firstTs, lastTs }
            };
          }
          
          // Vérifier la signature
          const messageToVerify = canonicalRecord;
          const signatureValid = this._verify(messageToVerify, record.sig, publicKey);
          if (!signatureValid) {
            return {
              ok: false,
              failure: {
                type: 'SIG_INVALID',
                seq: record.seq,
                reason: `Signature verification failed for record ${record.seq}`
              },
              stats: { checked, firstTs, lastTs }
            };
          }
          
          // Mettre à jour l'état
          previousHash = record.hash;
          previousSeq = record.seq;
          if (!firstTs) firstTs = record.ts;
          lastTs = record.ts;
        }
        
        // Si on a atteint la fin du range, sortir
        if (to !== undefined && previousSeq >= to) break;
      }
      
      return {
        ok: true,
        stats: {
          checked,
          firstTs,
          lastTs
        }
      };
      
    } catch (error) {
      return {
        ok: false,
        failure: {
          type: 'VERIFY_ERROR',
          seq: null,
          reason: `Verification error: ${error.message}`
        },
        stats: { checked: 0, firstTs: null, lastTs: null }
      };
    }
  }
}

export default TamperEvidentAuditLog;
