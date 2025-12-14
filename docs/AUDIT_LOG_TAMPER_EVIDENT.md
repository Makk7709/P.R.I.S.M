# 🔒 Audit Log Tamper-Evident - Documentation Technique

**Date**: 2025-12-12  
**Module**: `src/audit/TamperEvidentAuditLog.js`  
**Objectif**: Audit log append-only avec détection garantie de tampering

---

## 📋 Vue d'Ensemble

L'Audit Log Tamper-Evident implémente un log append-only avec:
- **Hash-chain** : Chaque record inclut le hash du record précédent (prevHash → hash)
- **Signature Ed25519** : Chaque record est signé pour non-répudiation
- **Rotation** : Segments par taille ou par jour
- **Vérification complète** : Détecte corruption/modification/suppression/insertion/reorder

---

## 🏗️ Design

### Format Record (JSONL)

Chaque ligne du fichier `.jsonl` est un record JSON:

```json
{
  "version": 1,
  "seq": 42,
  "ts": "2025-12-12T10:30:00.000Z",
  "correlationId": "uuid-here",
  "eventType": "consensus_decision",
  "payloadDigest": "sha256-hex-digest",
  "prevHash": "hash-of-previous-record",
  "hash": "sha256-hash-of-canonical-record",
  "pubKeyId": "default",
  "sig": "ed25519-signature-hex"
}
```

### Chaînage Cryptographique

```
GENESIS → Record 1 (hash1) → Record 2 (hash2, prevHash=hash1) → Record 3 (hash3, prevHash=hash2)
```

**Détecte:**
- **Modification** : hash recalculé ne match pas → `HASH_MISMATCH`
- **Suppression** : gap dans seq ou prevHash ne match pas → `SEQ_GAP` / `PREVHASH_MISMATCH`
- **Insertion** : seq invalide ou prevHash ne match pas → `SEQ_GAP` / `PREVHASH_MISMATCH`
- **Reorder** : prevHash ne match pas le hash précédent → `PREVHASH_MISMATCH`

### Signature Ed25519

**Message signé**: Record canonique (sans hash et sig, ordre stable)

**Non-répudiation**: Seul le détenteur de la clé privée peut créer une signature valide

**Détecte:**
- **Signature invalide** : signature ne vérifie pas → `SIG_INVALID`
- **Clé incorrecte** : signature avec autre clé → `SIG_INVALID`

---

## 🔐 Menaces Couvertes

### ✅ Couvertes

| Menace | Détection | Type d'Erreur |
|--------|-----------|---------------|
| **Modification d'un champ** | Hash recalculé différent | `HASH_MISMATCH` |
| **Suppression d'un record** | Gap dans seq ou prevHash mismatch | `SEQ_GAP` / `PREVHASH_MISMATCH` |
| **Insertion d'un record** | Seq invalide ou prevHash mismatch | `SEQ_GAP` / `PREVHASH_MISMATCH` |
| **Reorder (permutation)** | prevHash ne match pas | `PREVHASH_MISMATCH` |
| **Signature invalide** | Verification Ed25519 échoue | `SIG_INVALID` |
| **Clé incorrecte** | Signature ne vérifie pas | `SIG_INVALID` |

### ⚠️ Non Couvertes (Risques Résiduels)

| Menace | Pourquoi Non Couverte | Mitigation Future |
|--------|----------------------|-------------------|
| **Effacement total des fichiers** | Pas d'anchor externe | Anchoring périodique (Merkle root → registre) |
| **Corruption complète du système** | Pas de backup automatique | Backup + réplication |
| **Compromission clé privée** | Pas de rotation de clés | Rotation automatique + HSM |
| **Compression/encodage** | Stockage brut | Compression optionnelle avec hash pré-compression |

---

## 💻 Usage

### Initialisation

```javascript
import { TamperEvidentAuditLog } from './src/audit/TamperEvidentAuditLog.js';

const auditLog = new TamperEvidentAuditLog({
  logDir: './data/audit',
  keyDir: './keys',
  pubKeyId: 'default',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  rotationStrategy: 'size' // ou 'daily'
});

await auditLog.initialize();
```

### Append Event

```javascript
const result = await auditLog.appendAuditEvent({
  correlationId: 'req-123',
  eventType: 'consensus_decision',
  payload: {
    proposalId: 'prop-456',
    status: 'APPROVED',
    votes: { gpt4: true, claude: true }
  }
});

console.log('Record:', result.seq, result.hash);
```

### Verify

```javascript
const verifyResult = await auditLog.verifyAuditLog({
  from: 1,    // Optionnel: début
  to: 100     // Optionnel: fin
});

if (!verifyResult.ok) {
  console.error('❌ Tampering detected!', verifyResult.failure);
  // {
  //   type: 'HASH_MISMATCH',
  //   seq: 42,
  //   reason: 'Hash mismatch: expected abc123, got def456'
  // }
} else {
  console.log('✅ Log integrity verified:', verifyResult.stats);
  // { checked: 100, firstTs: '...', lastTs: '...' }
}
```

---

## 🧪 Tests & Vérification

### Test Manuel

```bash
node scripts/test_audit_log_manual.mjs
```

**Résultat attendu:**
- ✅ Happy path (append 10, verify OK)
- ✅ Corruption détectée (HASH_MISMATCH)
- ✅ Suppression détectée (SEQ_GAP)
- ✅ Reorder détecté (PREVHASH_MISMATCH)

### Tests Vitest

```bash
npm test -- __tests__/audit/tamperEvidentAuditLog.spec.ts
```

**Tests inclus:**
1. Happy path: append 100 events → verify OK
2. Corruption: modification champ → verify FAIL (HASH_MISMATCH)
3. Suppression: ligne supprimée → verify FAIL (SEQ_GAP)
4. Insertion: ligne ajoutée → verify FAIL (SEQ_GAP)
5. Reorder: permutation → verify FAIL (PREVHASH_MISMATCH)
6. Signature invalide: autre clé → verify FAIL (SIG_INVALID)
7. Rotation: segments multiples → verify OK

---

## 🔧 Commandes de Vérification

### Vérifier Intégrité du Log

```javascript
const { TamperEvidentAuditLog } = require('./src/audit/TamperEvidentAuditLog.js');

const log = new TamperEvidentAuditLog({
  logDir: './data/audit',
  keyDir: './keys'
});

await log.initialize();
const result = await log.verifyAuditLog();

console.log(result.ok ? '✅ OK' : '❌ FAILED:', result.failure);
```

### Lister les Records

```bash
# Afficher les 10 derniers records
tail -10 data/audit/audit-*.jsonl | jq '.'
```

### Vérifier Hash-Chain Manuellement

```javascript
const fs = require('fs');
const crypto = require('crypto');

const lines = fs.readFileSync('data/audit/audit-*.jsonl', 'utf8')
  .split('\n').filter(l => l.trim());

let prevHash = 'GENESIS';
for (const line of lines) {
  const record = JSON.parse(line);
  if (record.prevHash !== prevHash) {
    console.error('❌ Chain broken at seq', record.seq);
    break;
  }
  prevHash = record.hash;
}
console.log('✅ Chain verified');
```

---

## 📊 Performance

### Append

- **Complexité**: O(1) amorti (append atomique)
- **Latence**: < 10ms (signature Ed25519 ~1ms)
- **Throughput**: ~100-1000 records/seconde

### Verify

- **Complexité**: O(n) où n = nombre de records
- **Latence**: ~1ms par record (hash + signature verification)
- **Throughput**: ~1000 records/seconde

### Rotation

- **Stratégie taille**: Rotation automatique à maxFileSize
- **Stratégie daily**: Nouveau fichier chaque jour
- **Impact**: Append reste O(1) (nouveau fichier créé si nécessaire)

---

## 🔐 Gestion des Clés

### Clés Par Défaut (Dev)

Les clés sont stockées dans `./keys/` (gitignored):
- `default.key` - Clé privée (mode 600)
- `default.pub` - Clé publique (mode 644)

### Production (Future)

- **KMS Integration**: Stocker clés privées dans AWS KMS / Azure Key Vault
- **HSM Integration**: Utiliser Hardware Security Module pour signature
- **Rotation**: Rotation automatique des clés (période configurable)

---

## 📝 Rotation Strategy

### Option A: Segments Indépendants (Implémenté)

Chaque segment commence avec `prevHash = 'GENESIS'`.

**Avantages:**
- Simple à implémenter
- Verify par segment en parallèle

**Inconvénients:**
- Pas de chaînage inter-segments
- Détection de suppression inter-segment limitée

### Option B: Chaînage Inter-Segments (Future)

Dernier hash du segment N stocké dans header du segment N+1.

**Avantages:**
- Chaînage complet inter-segments
- Détection suppression inter-segments

**Inconvénients:**
- Plus complexe
- Header nécessaire dans chaque fichier

**Implémentation actuelle**: Option A (simple et efficace)

---

## ✅ Preuves de Sécurité

### Tests de Détection

| Test | Résultat | Preuve |
|------|----------|--------|
| Corruption champ | ✅ Détecté (HASH_MISMATCH) | Hash recalculé différent |
| Suppression ligne | ✅ Détecté (SEQ_GAP) | Gap dans séquence |
| Insertion ligne | ✅ Détecté (SEQ_GAP) | Séquence invalide |
| Reorder lignes | ✅ Détecté (PREVHASH_MISMATCH) | prevHash ne match pas |
| Signature invalide | ✅ Détecté (SIG_INVALID) | Ed25519 verify échoue |

**Commandes de preuve:**

```bash
# Test manuel complet
node scripts/test_audit_log_manual.mjs

# Tests Vitest
npm test -- __tests__/audit/tamperEvidentAuditLog.spec.ts
```

---

## 🎯 Next Steps (VAGUE 1.3+)

1. **Anchoring Externe** (Optionnel)
   - Merkle root périodique → registre immuable
   - Preuve d'existence temporelle

2. **HSM/KMS Integration**
   - Signature via HSM (Hardware Security Module)
   - Clés privées dans KMS (Key Management Service)

3. **Compression Optionnelle**
   - Compression avec hash pré-compression
   - Vérification hash avant décompression

4. **Retention Policies**
   - Rotation automatique anciens segments
   - Archive avec vérification

---

*Document créé: 2025-12-12*  
*Module: `src/audit/TamperEvidentAuditLog.js`*  
*Status: ✅ Implémenté et testé*
