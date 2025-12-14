# 🛡️ Threat Model Mini - PRISM

**Date**: 2025-12-12  
**Scope**: PRISM Military-Grade MVP

---

## 🎯 Objectif

Identifier les menaces réalistes sur PRISM et documenter les protections en place.

---

## 🔒 Menaces Identifiées

### 1. Injection de Données Malformées

**Menace**: Attaquant envoie des données non conformes aux schémas attendus.

**Surface d'attaque:**
- ProviderAdapters (réponses API)
- ConsensusManager (propositions, votes)
- TrustContext (requêtes d'approbation)
- SecureJournalManager (entrées journal)

**Protection:**
- ✅ Validation fail-closed avec schémas Zod stricts
- ✅ Rejet explicite si validation échoue
- ✅ Logging structuré des rejets

**Status**: ✅ COUVERT (VAGUE 1.1)

---

### 2. Tampering Audit Log

**Menace**: Attaquant modifie/supprime/insère/reordonne des records dans l'audit log.

**Surface d'attaque:**
- Fichiers audit log (`data/audit/*.jsonl`)

**Protection:**
- ✅ Hash-chain (prevHash → hash) détecte modification/suppression/insertion/reorder
- ✅ Signature Ed25519 détecte signature invalide
- ✅ Verify complet avant utilisation

**Status**: ✅ COUVERT (VAGUE 1.2)

**Tests de preuve:**
```bash
node scripts/control_audit_log_military.mjs
# ✅ 6/6 tests passent - Détection garantie
```

---

### 3. Bypass TrustContext

**Menace**: Attaquant contourne TrustContext pour exécuter actions critiques.

**Surface d'attaque:**
- HybridOrchestrator (requêtes critiques)
- ExcelAnalyzer (fichiers volumineux/sensibles)
- server.js (API endpoints)

**Protection:**
- ✅ TrustContext intégré dans tous les modules critiques
- ✅ Validation avant ConsensusManager
- ✅ Blocage si rejet

**Status**: ✅ COUVERT (Audit précédent)

---

### 4. Provider Response Manipulation

**Menace**: Attaquant intercepte/modifie réponses des providers (OpenAI, Anthropic, etc.).

**Surface d'attaque:**
- ProviderAdapters (réponses HTTP)

**Protection:**
- ⏳ Validation fail-closed à implémenter (VAGUE 1.1 - pending)

**Status**: ⏳ EN COURS

---

### 5. Replay Attacks

**Menace**: Attaquant rejoue des requêtes précédentes.

**Surface d'attaque:**
- API endpoints (`/api/chat`)
- Consensus requests

**Protection:**
- ⚠️ Pas de protection actuelle (non-idempotent)
- ⏳ À ajouter: Nonces/timestamps/storage des requêtes traitées

**Status**: ⚠️ NON COUVERT

---

### 6. Compromission Clé Privée Audit Log

**Menace**: Attaquant obtient la clé privée Ed25519 pour signer de faux records.

**Surface d'attaque:**
- Fichier `keys/*.key`

**Protection:**
- ⚠️ Stockage local (dev)
- ⏳ Production: HSM/KMS requis

**Status**: ⚠️ RISQUE ACCEPTÉ (dev), ⏳ HSM/KMS (production)

---

### 7. Effacement Total Audit Log

**Menace**: Attaquant supprime tous les fichiers d'audit log.

**Surface d'attaque:**
- Répertoire `data/audit/`

**Protection:**
- ⚠️ Pas de protection actuelle
- ⏳ À ajouter: Anchoring externe (Merkle root → registre immuable)
- ⏳ Backup automatique

**Status**: ⚠️ RISQUE RÉSIDUEL (documenté)

---

## 📊 Matrice de Menaces

| Menace | Probabilité | Impact | Mitigation | Status |
|--------|-------------|--------|------------|--------|
| Injection données malformées | HAUTE | MOYEN | Validation fail-closed | ✅ COUVERT |
| Tampering audit log | MOYENNE | CRITIQUE | Hash-chain + Ed25519 | ✅ COUVERT |
| Bypass TrustContext | BASSE | CRITIQUE | Intégration systématique | ✅ COUVERT |
| Provider response manipulation | MOYENNE | MOYEN | Validation (à implémenter) | ⏳ EN COURS |
| Replay attacks | BASSE | MOYEN | Nonces/timestamps (à ajouter) | ⚠️ NON COUVERT |
| Compromission clé privée | TRÈS BASSE | CRITIQUE | HSM/KMS (production) | ⚠️ ACCEPTÉ (dev) |
| Effacement total audit log | TRÈS BASSE | CRITIQUE | Anchoring + backup (à ajouter) | ⚠️ RISQUE RÉSIDUEL |

---

## ✅ Protections Actuelles

### Fail-Closed Validation
- ConsensusManager: DecisionProposalSchema, VoteSchema
- TrustContext: CriticalDecisionRequestSchema, ApprovalRequestSchema
- SecureJournalManager: JournalEntryInputSchema

### Tamper-Evident Audit Log
- Hash-chain détecte modification/suppression/insertion/reorder
- Ed25519 détecte signature invalide
- Verify complet avec tests de preuve

### TrustContext Integration
- HybridOrchestrator: Validation avant Consensus
- ExcelAnalyzer: Validation fichiers > 10MB
- server.js: Validation requêtes critiques

---

## ⚠️ Risques Résiduels

### Acceptés (Dev)
- Clés privées stockées localement (production → HSM/KMS)
- Pas de backup automatique audit log (production → backup)

### À Mitiger (Production)
- Replay attacks → Nonces/timestamps
- Effacement total → Anchoring externe + backup
- Provider manipulation → Validation fail-closed (en cours)

---

## 🎯 Next Steps (VAGUE 1.3+)

1. **ProviderAdapters Validation** (VAGUE 1.1)
   - Schémas ProviderResponse
   - Validation fail-closed

2. **Anchoring Externe** (Optionnel)
   - Merkle root périodique → registre immuable
   - Preuve d'existence temporelle

3. **Replay Protection**
   - Nonces/timestamps
   - Storage requêtes traitées

4. **HSM/KMS Integration**
   - Clés privées dans Hardware Security Module
   - Rotation automatique

---

*Document créé: 2025-12-12*  
*Status: ✅ Menaces principales couvertes*  
*Next: ProviderAdapters validation + Replay protection*
