# TrustContext - Key Management (TRL 5)

**Date**: 2025-12-14  
**Module**: `src/core/KeyRegistry.js`  
**Status**: ✅ **Implémenté** (TRL 5: Registry + révocation + rotation manuelle)

---

## 1. Vue d'Ensemble

KeyRegistry est un registre centralisé pour gérer les clés publiques des approvers TrustContext. Il permet:
- Enregistrement de clés Ed25519
- Statut actif/révoqué
- Révocation de clés
- Rotation manuelle (révoquer ancienne + enregistrer nouvelle)
- Association de rôles aux clés
- Persistance JSON

---

## 2. Format du Registry

```json
{
  "keys": {
    "owner-001": {
      "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
      "status": "active",
      "roleBindings": ["owner"],
      "createdAt": 1702579200000,
      "revokedAt": null,
      "revokedBy": null,
      "rotatedFrom": null
    }
  },
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": 1702579200000
  }
}
```

**Emplacement par défaut**: `data/key-registry.json`  
**Permissions**: 0o600 (lecture/écriture propriétaire uniquement)

---

## 3. Usage

### 3.1 Initialisation

```javascript
import { getKeyRegistry } from './src/core/KeyRegistry.js';

const registry = getKeyRegistry({
  registryPath: './data/key-registry.json'
});

await registry.initialize();
```

### 3.2 Enregistrer une Clé

```javascript
// Générer paire de clés Ed25519
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Enregistrer clé publique
await registry.registerKey('owner-001', publicKey, ['owner']);

// Sauvegarder clé privée ailleurs (ne jamais commiter!)
// fs.writeFileSync('./keys/owner-001.key', privateKey, { mode: 0o600 });
```

### 3.3 Révoquer une Clé

```javascript
await registry.revokeKey('owner-001', 'admin-001');

// La clé ne sera plus utilisable pour vérifier des signatures
```

### 3.4 Rotation Manuelle

```javascript
// 1. Générer nouvelle paire de clés
const { publicKey: newPublicKey, privateKey: newPrivateKey } = 
  crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

// 2. Rotater (révoque ancienne + enregistre nouvelle)
await registry.rotateKey(
  'owner-001',      // Ancienne clé
  'owner-002',      // Nouvelle clé
  newPublicKey,     // Nouvelle clé publique
  ['owner'],        // Rôles (copiés si null)
  'admin-001'       // Qui effectue la rotation
);

// 3. Toutes nouvelles approbations doivent utiliser owner-002
// Les approbations signées avec owner-001 seront rejetées (clé révoquée)
```

### 3.5 Vérifier si Clé Active

```javascript
if (registry.isActive('owner-001')) {
  const publicKey = registry.getPublicKey('owner-001');
  // Utiliser publicKey pour vérifier signature
}
```

### 3.6 Lister Clés Actives

```javascript
const activeKeys = registry.listActiveKeys();
// [
//   { keyId: 'owner-001', roleBindings: ['owner'], createdAt: 1702579200000 },
//   ...
// ]
```

---

## 4. Intégration avec TrustContext

TrustContext utilise KeyRegistry automatiquement (prioritaire sur fichiers .pub legacy):

```javascript
const trustContext = new TrustContext({
  keyRegistry: getKeyRegistry({
    registryPath: process.env.TRUSTCONTEXT_KEYREGISTRY_PATH || './data/key-registry.json'
  })
});

await trustContext.initialize();
// TrustContext charge les clés depuis KeyRegistry
```

**Priorité de chargement**:
1. KeyRegistry (clés actives uniquement)
2. Fichiers .pub dans `keyDir` (fallback legacy)

---

## 5. Sécurité

### 5.1 Permissions Fichier

Le registry est sauvegardé avec permissions `0o600` (lecture/écriture propriétaire uniquement).

### 5.2 Révocation

Une clé révoquée ne peut plus être utilisée pour vérifier des signatures. TrustContext vérifie `isActive()` avant d'utiliser une clé.

### 5.3 Rotation

Rotation manuelle recommandée:
- **Fréquence**: Selon politique sécurité (ex: tous les 90 jours)
- **Processus**:
  1. Générer nouvelle paire
  2. Enregistrer nouvelle clé dans registry
  3. Distribuer nouvelle clé privée aux approvers
  4. Révoquer ancienne clé après période de transition
  5. Supprimer ancienne clé privée

---

## 6. Limitations Actuelles (TRL 5)

- ⚠️ **Stockage local** : Fichier JSON (pas HSM/KMS)
- ⚠️ **Rotation manuelle** : Pas de rotation automatique
- ⚠️ **Pas de KMS/HSM** : Intégration optionnelle future

---

## 7. Option Enterprise (Futur)

### 7.1 Interface KeyProvider

Pour intégrer KMS/HSM (AWS KMS, Azure Key Vault, HashiCorp Vault), créer une interface:

```javascript
class KeyProvider {
  async getPublicKey(keyId) { }
  async isActive(keyId) { }
  async revokeKey(keyId) { }
}

class KMSKeyProvider extends KeyProvider {
  // Implémentation AWS KMS / Azure Key Vault / etc.
}
```

### 7.2 Activation

```javascript
const trustContext = new TrustContext({
  keyProvider: new KMSKeyProvider({
    // Config KMS
  })
});
```

**Note**: Cette fonctionnalité n'est pas requise pour TRL 5.

---

## 8. Setup Staging

Pour setup initial des clés de test:

```bash
npm run staging:setup
```

Ce script génère:
- 3 clés de test: `owner-001`, `security-001`, `lead-001`
- Enregistre dans KeyRegistry
- Sauvegarde clés privées dans `keys/approvers/` (ne jamais commiter!)

---

**Document généré le**: 2025-12-14  
**Version**: 1.0.0  
**Status**: ✅ **TRL 5 Validé**
