/**
 * Utilities cryptographiques (fingerprints, validation keypair)
 */

import crypto from 'node:crypto';

/**
 * Calcule un fingerprint SHA-256 d'une clé publique (DER SPKI)
 * @param {string} publicKeyPem - Clé publique PEM
 * @returns {string} Fingerprint hex (64 chars)
 */
export function fingerprintPublicKey(publicKeyPem) {
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const der = publicKey.export({ type: 'spki', format: 'der' });
    return crypto.createHash('sha256').update(der).digest('hex');
  } catch (error) {
    throw new Error(`Failed to compute public key fingerprint: ${error.message}`);
  }
}

/**
 * Dérive la clé publique depuis une clé privée
 * @param {string} privateKeyPem - Clé privée PEM
 * @returns {string} Clé publique PEM
 */
export function derivePublicKeyFromPrivate(privateKeyPem) {
  try {
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    // Pour Ed25519, exporter directement la clé publique depuis la privée
    // Node.js permet d'exporter la partie publique depuis une clé privée
    const publicKey = crypto.createPublicKey(privateKey);
    return publicKey.export({ type: 'spki', format: 'pem' });
  } catch (error) {
    throw new Error(`Failed to derive public key: ${error.message}`);
  }
}

/**
 * Vérifie qu'une paire de clés (privée, publique) correspond
 * Méthode: signer un message de test avec privateKey et vérifier avec publicKey
 * @param {string} privateKeyPem - Clé privée PEM
 * @param {string} publicKeyPem - Clé publique PEM
 * @returns {boolean} True si les clés correspondent
 */
export function verifyKeypairMatch(privateKeyPem, publicKeyPem) {
  try {
    // Méthode plus fiable: signer un message de test et vérifier
    const testMessage = Buffer.from('keypair-verification-test');
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const publicKey = crypto.createPublicKey(publicKeyPem);
    
    // Signer avec la clé privée
    const signature = crypto.sign(null, testMessage, privateKey);
    
    // Vérifier avec la clé publique
    const isValid = crypto.verify(null, testMessage, publicKey, signature);
    
    return isValid;
  } catch (error) {
    console.warn(`[cryptoUtils] Keypair match verification failed: ${error.message}`);
    return false;
  }
}
