# TrustContext - Governance Contract & Signed Approval Format

**Date**: 2025-12-14  
**Module**: `src/core/TrustContext.js`  
**Status**: ✅ **Implémenté** (vérification cryptographique complète)

---

## 1. Vue d'Ensemble

TrustContext garantit qu'aucune décision critique ne peut être approuvée sans :
1. **Signature cryptographique valide** (Ed25519)
2. **DecisionDigest immuable** (hash stable de la décision)
3. **Autorisation selon politique de gouvernance** (matrice criticité → rôles)

**Principe fail-closed** : toute erreur dans l'une de ces vérifications → rejet explicite.

---

## 2. DecisionDigest (Immutabilité)

### 2.1 Format

Le `DecisionDigest` est un hash SHA-256 (64 caractères hex) calculé de manière **stable** (sans timestamp).

### 2.2 Calcul

```javascript
function computeDecisionDigest(decisionId, decisionType, criticality, decisionData, context) {
  // Canonicalisation stable (ordre des clés fixe)
  const canonical = {
    decisionId,
    type: decisionType,
    criticality,
    data: canonicalizeObject(decisionData),
    context: canonicalizeObject(context)
  };
  
  const canonicalString = JSON.stringify(canonical, Object.keys(canonical).sort());
  return sha256(canonicalString); // Hex, 64 chars
}
```

### 2.3 Propriétés

- **Stable** : même décision → même digest (même si calculé à des moments différents)
- **Immuable** : toute modification de `decisionId`, `decisionType`, `criticality`, `decisionData`, ou `context` change le digest
- **Utilisation** : Vérification que l'approbation signée correspond bien à la décision en attente

---

## 3. Format d'Approbation Signée

### 3.1 Structure Canonique

```typescript
{
  approvalId: string;        // UUID unique de l'approbation
  decisionId: string;        // Token de la décision (approvalToken)
  decisionDigest: string;    // SHA-256 hex (64 chars)
  approver: {
    id: string;              // Identifiant approver
    role: string;            // Rôle (ex: 'lead', 'security', 'owner')
    keyId: string;           // Identifiant clé publique
  };
  verdict: 'approve' | 'reject';
  reason?: string;           // Raison optionnelle
  issuedAt: number;          // Timestamp (ms)
  expiresAt?: number;        // Timestamp expiration optionnel
  signature: string;         // Signature Ed25519 hex (requis)
}
```

### 3.2 Signature

**Message signé** : Payload canonique (sans `signature`, ordre des clés stable)

```javascript
const payload = {
  approvalId,
  decisionId,
  decisionDigest,
  approver,
  verdict,
  reason,
  issuedAt,
  expiresAt
};

const canonicalPayload = JSON.stringify(payload, Object.keys(payload).sort());
const signature = Ed25519.sign(canonicalPayload, privateKey);
```

**Vérification** : `Ed25519.verify(canonicalPayload, signature, publicKey)`

---

## 4. Politique de Gouvernance Minimale

### 4.1 Matrice Criticité → Rôles Autorisés

| Criticité | Rôles Autorisés |
|-----------|-----------------|
| `LOW`     | `lead`, `security`, `owner` |
| `MEDIUM`  | `lead`, `security`, `owner` |
| `HIGH`    | `security`, `owner` |
| `CRITICAL`| `owner` uniquement |

### 4.2 Règles

- **Default deny** : Si role absent, inconnu, ou non dans la liste autorisée → rejet
- **Policy incomplète** : Si criticité n'a pas de policy définie → rejet
- **Vérification obligatoire** : `isApproverAuthorized(approver, criticality)` doit retourner `true`

---

## 5. Vérification d'Approbation (Fail-Closed)

### 5.1 Étapes de Vérification

1. **Validation Zod stricte** : Structure conforme à `SignedApprovalSchema`
2. **DecisionDigest match** : `signedApproval.decisionDigest === decision.decisionDigest`
3. **DecisionId match** : `signedApproval.decisionId === decision.token`
4. **Expiration** : Si `expiresAt` présent, vérifier `now <= expiresAt`
5. **Autorisation** : `isApproverAuthorized(approver, criticality)` retourne `true`
6. **Signature cryptographique** : `Ed25519.verify()` réussit avec la clé publique correspondant à `keyId`

### 5.2 Codes d'Erreur

- `SCHEMA_INVALID` : Validation Zod échoue
- `DIGEST_MISMATCH` : DecisionDigest ou DecisionId ne correspondent pas
- `EXPIRED` : Signature expirée (expiresAt < now)
- `AUTHORIZATION_FAILED` : Role non autorisé pour cette criticité
- `KEY_UNKNOWN` : Clé publique non trouvée pour keyId
- `SIGNATURE_INVALID` : Vérification Ed25519 échoue

### 5.3 Garanties Fail-Closed

- ✅ **Aucune approbation possible sans `verifyApproval()` OK**
- ✅ **Toute erreur → rejet explicite + audit entry**
- ✅ **Signature obligatoire** : pas d'approbation "textuelle" ou "id-only"
- ✅ **Default deny** : policy/role absent → rejet

---

## 6. Usage

### 6.1 Créer une Approbation Signée (Côté Approver)

```javascript
import { createSignedApproval } from './src/core/TrustContext.js';

// Après avoir récupéré decisionDigest et decisionId depuis TrustContext
const signedApproval = createSignedApproval({
  approvalId: crypto.randomUUID(),
  decisionId: approvalToken,
  decisionDigest: decisionDigest,
  approver: {
    id: 'approver-001',
    role: 'owner',
    keyId: 'approver-001-key'
  },
  verdict: 'approve',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 3600000, // Optionnel
  privateKeyPem: approverPrivateKeyPem
});
```

### 6.2 Soumettre l'Approbation (Côté TrustContext)

```javascript
const result = await trustContext.approveDecision(signedApproval);
if (result) {
  console.log('Decision approved');
} else {
  console.error('Approval failed');
}
```

---

## 7. Garanties de Sécurité

### 7.1 Non-Répudiation

- Seul le détenteur de la clé privée peut créer une signature valide
- Signature liée au DecisionDigest : ne peut pas être réutilisée pour autre décision

### 7.2 Détection d'Altération

- Modification 1-bit du payload → signature invalide
- Modification DecisionDigest → rejet (DIGEST_MISMATCH)
- Modification DecisionId → rejet (DIGEST_MISMATCH)

### 7.3 Autorisation

- Vérification role → criticité via matrice de gouvernance
- Default deny systématique si policy/role absent

---

## 8. Limitations Actuelles

- ⚠️ **Clés stockées localement** : Fichiers PEM (pas de HSM/KMS)
- ⚠️ **Rotation clés** : Pas de rotation automatique implémentée
- ⚠️ **UI absente** : Pas d'interface utilisateur pour gestion approbations (workflow manuel)

---

**Document généré le**: 2025-12-14  
**Module**: `src/core/TrustContext.js`  
**Contrats**: `src/security/contracts/trustcontext.js`
