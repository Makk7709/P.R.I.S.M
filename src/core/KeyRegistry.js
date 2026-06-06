/**
 * KeyRegistry - Gestion centralisée des clés publiques des approvers
 * TRL 5: Registry avec révocation et rotation manuelle
 *
 * Format registry:
 * {
 *   keys: {
 *     "keyId": {
 *       publicKeyPem: string,
 *       status: "active" | "revoked",
 *       roleBindings: string[], // ["owner", "security"]
 *       createdAt: number,
 *       revokedAt?: number,
 *       revokedBy?: string,
 *       rotatedFrom?: string // keyId précédent si rotation
 *     }
 *   },
 *   metadata: {
 *     version: string,
 *     lastUpdated: number
 *   }
 * }
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { fingerprintPublicKey, verifyKeypairMatch } from './cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class KeyRegistry {
  constructor(options = {}) {
    this.registryPath =
      options.registryPath ||
      process.env.TRUSTCONTEXT_KEYREGISTRY_PATH ||
      path.join(process.cwd(), 'data', 'key-registry.json');

    this.registry = {
      keys: {},
      metadata: {
        version: '1.0.0',
        lastUpdated: Date.now(),
      },
    };

    this._initialized = false;
  }

  /**
   * Initialise le registry (charge depuis fichier ou crée si absent)
   */
  async initialize() {
    if (this._initialized) return;

    try {
      // Créer répertoire parent si nécessaire
      const parentDir = path.dirname(this.registryPath);
      await fs.mkdir(parentDir, { recursive: true });

      // Charger registry existant
      try {
        const content = await fs.readFile(this.registryPath, 'utf8');
        this.registry = JSON.parse(content);

        // Valider structure
        if (!this.registry.keys || !this.registry.metadata) {
          throw new Error('Invalid registry format');
        }

        console.log(
          `[KeyRegistry] Loaded ${Object.keys(this.registry.keys).length} keys from registry`
        );
      } catch (error) {
        if (error.code === 'ENOENT') {
          // Fichier absent: initialiser registry vide
          await this._saveRegistry();
          console.log('[KeyRegistry] Created new registry');
        } else {
          throw error;
        }
      }

      this._initialized = true;
    } catch (error) {
      console.error('[KeyRegistry] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Enregistre une nouvelle clé
   * @param {string} keyId - Identifiant unique de la clé
   * @param {string} publicKeyPem - Clé publique PEM
   * @param {string[]} roleBindings - Rôles associés
   * @param {string} privateKeyPem - Clé privée PEM (optionnel, pour vérifier keypair match)
   * @returns {Promise<void>}
   */
  async registerKey(keyId, publicKeyPem, roleBindings = [], privateKeyPem = null) {
    await this.initialize();

    if (this.registry.keys[keyId]) {
      throw new Error(`Key ${keyId} already exists`);
    }

    // Valider format PEM
    let publicKey;
    try {
      publicKey = crypto.createPublicKey(publicKeyPem);
    } catch (error) {
      throw new Error(`Invalid public key PEM: ${error.message}`);
    }

    // Calculer fingerprint
    const fingerprint = fingerprintPublicKey(publicKeyPem);

    // Vérifier keypair match si privateKey fournie
    if (privateKeyPem) {
      const matches = verifyKeypairMatch(privateKeyPem, publicKeyPem);
      if (!matches) {
        throw new Error(
          `Keypair mismatch: private key does not correspond to public key for ${keyId}`
        );
      }
    }

    this.registry.keys[keyId] = {
      publicKeyPem,
      fingerprint, // Stocker fingerprint pour validation
      status: 'active',
      roleBindings,
      createdAt: Date.now(),
    };

    this.registry.metadata.lastUpdated = Date.now();

    await this._saveRegistry();
    console.log(
      `[KeyRegistry] Registered key: ${keyId} (fingerprint: ${fingerprint.substring(0, 16)}...)`
    );
  }

  /**
   * Récupère une clé publique active
   * @param {string} keyId - Identifiant de la clé
   * @returns {string|null} Clé publique PEM ou null si absente/révoquée
   */
  getPublicKey(keyId) {
    const keyEntry = this.registry.keys[keyId];

    if (!keyEntry) {
      return null;
    }

    if (keyEntry.status !== 'active') {
      return null;
    }

    return keyEntry.publicKeyPem;
  }

  /**
   * Vérifie si une clé est active
   * @param {string} keyId - Identifiant de la clé
   * @returns {boolean}
   */
  isActive(keyId) {
    const keyEntry = this.registry.keys[keyId];
    return keyEntry?.status === 'active';
  }

  /**
   * Révoque une clé
   * @param {string} keyId - Identifiant de la clé
   * @param {string} revokedBy - ID de l'entité révoquant
   * @returns {Promise<void>}
   */
  async revokeKey(keyId, revokedBy = 'system') {
    await this.initialize();

    const keyEntry = this.registry.keys[keyId];

    if (!keyEntry) {
      throw new Error(`Key ${keyId} not found`);
    }

    if (keyEntry.status === 'revoked') {
      console.warn(`[KeyRegistry] Key ${keyId} already revoked`);
      return;
    }

    keyEntry.status = 'revoked';
    keyEntry.revokedAt = Date.now();
    keyEntry.revokedBy = revokedBy;

    this.registry.metadata.lastUpdated = Date.now();

    await this._saveRegistry();
    console.log(`[KeyRegistry] Revoked key: ${keyId} (by ${revokedBy})`);
  }

  /**
   * Rotation manuelle: révoque ancienne clé et enregistre nouvelle
   * @param {string} oldKeyId - ID de l'ancienne clé
   * @param {string} newKeyId - ID de la nouvelle clé
   * @param {string} newPublicKeyPem - Nouvelle clé publique PEM
   * @param {string[]} roleBindings - Rôles (copiés de l'ancienne si non fournis)
   * @param {string} rotatedBy - ID de l'entité effectuant la rotation
   * @returns {Promise<void>}
   */
  async rotateKey(oldKeyId, newKeyId, newPublicKeyPem, roleBindings = null, rotatedBy = 'system') {
    await this.initialize();

    const oldKeyEntry = this.registry.keys[oldKeyId];

    if (!oldKeyEntry) {
      throw new Error(`Old key ${oldKeyId} not found`);
    }

    // Révoquer ancienne clé
    await this.revokeKey(oldKeyId, rotatedBy);

    // Enregistrer nouvelle clé avec référence à l'ancienne
    const roles = roleBindings || oldKeyEntry.roleBindings;
    await this.registerKey(newKeyId, newPublicKeyPem, roles);

    // Marquer rotation
    this.registry.keys[newKeyId].rotatedFrom = oldKeyId;
    this.registry.metadata.lastUpdated = Date.now();

    await this._saveRegistry();
    console.log(`[KeyRegistry] Rotated key: ${oldKeyId} → ${newKeyId}`);
  }

  /**
   * Liste toutes les clés actives
   * @returns {Array<{keyId, roleBindings, createdAt}>}
   */
  listActiveKeys() {
    return Object.entries(this.registry.keys)
      .filter(([_, entry]) => entry.status === 'active')
      .map(([keyId, entry]) => ({
        keyId,
        roleBindings: entry.roleBindings,
        createdAt: entry.createdAt,
        rotatedFrom: entry.rotatedFrom,
      }));
  }

  /**
   * Exporte le registry (pour backup/audit)
   * @returns {Object} Registry complet
   */
  export() {
    return JSON.parse(JSON.stringify(this.registry));
  }

  /**
   * Sauvegarde le registry sur disque
   * @private
   */
  async _saveRegistry() {
    try {
      await fs.writeFile(
        this.registryPath,
        JSON.stringify(this.registry, null, 2),
        { mode: 0o600 } // Permissions restrictives
      );
    } catch (error) {
      console.error('[KeyRegistry] Failed to save registry:', error.message);
      throw error;
    }
  }
}

// Instance singleton
let keyRegistryInstance = null;

/**
 * Obtient l'instance singleton du KeyRegistry
 * @param {Object} options - Configuration
 * @returns {KeyRegistry} Instance
 */
export function getKeyRegistry(options = {}) {
  if (!keyRegistryInstance) {
    keyRegistryInstance = new KeyRegistry(options);
  }
  return keyRegistryInstance;
}

export default KeyRegistry;
