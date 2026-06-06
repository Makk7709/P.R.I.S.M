#!/usr/bin/env node
/**
 * Setup script pour générer clés de test pour staging
 * Wipe registry + regenerate keys + verify keypair match
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getKeyRegistry } from '../../src/core/KeyRegistry.js';
import { verifyKeypairMatch, fingerprintPublicKey } from '../../src/core/cryptoUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupKeys() {
  const keysDir = path.join(process.cwd(), 'keys', 'approvers');
  await fs.mkdir(keysDir, { recursive: true });

  const registryPath = path.join(process.cwd(), 'data', 'key-registry.json');

  // WIPE registry existant (pour staging, on régénère à chaque fois)
  try {
    await fs.unlink(registryPath);
    console.log('[Setup] Wiped existing registry');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  // WIPE clés de test existantes
  try {
    const existingKeys = await fs.readdir(keysDir);
    for (const file of existingKeys) {
      if (file.endsWith('.key')) {
        await fs.unlink(path.join(keysDir, file));
      }
    }
    console.log('[Setup] Wiped existing test keys');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const registry = getKeyRegistry({ registryPath });
  await registry.initialize();

  // Générer clés de test
  const approvers = [
    { keyId: 'staging-owner-001', roles: ['owner'] },
    { keyId: 'staging-security-001', roles: ['security'] },
    { keyId: 'staging-lead-001', roles: ['lead'] },
  ];

  for (const approver of approvers) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Vérifier keypair match AVANT enregistrement
    const matches = verifyKeypairMatch(privateKey, publicKey);
    if (!matches) {
      throw new Error(`Keypair mismatch for ${approver.keyId} - this should never happen!`);
    }

    const fingerprint = fingerprintPublicKey(publicKey);
    console.log(`[Setup] Generated keypair for ${approver.keyId}:`);
    console.log(`  Fingerprint: ${fingerprint.substring(0, 16)}...`);

    // Enregistrer dans KeyRegistry avec vérification keypair
    await registry.registerKey(approver.keyId, publicKey, approver.roles, privateKey);

    // Sauvegarder clé privée (pour tests seulement, pas en production)
    const privateKeyPath = path.join(keysDir, `${approver.keyId}.key`);
    await fs.writeFile(privateKeyPath, privateKey, { mode: 0o600 });

    console.log(`✅ Registered key: ${approver.keyId} (roles: ${approver.roles.join(', ')})`);
    console.log(`   Private key: ${privateKeyPath}`);
  }

  console.log('\n✅ Keys setup complete!');
  console.log(`   Registry: ${registryPath}`);
}

setupKeys().catch(console.error);
