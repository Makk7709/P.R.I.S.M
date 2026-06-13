# Architecture — Sécurité

**Public cible** : développeurs, RSSI, auditeurs.  
**Objectif** : décrire les mécanismes de sécurité applicative, leurs limites et les références détaillées.

---

## 1. Principes observés

PRISM applique une sécurité **applicative** plutôt qu'une couche HTTP classique :

- **Gouvernance par criticité** (TrustContext) pour décisions sensibles
- **Consensus fail-closed** avec validation Zod
- **Audit cryptographique** chaîné (Ed25519)
- **Filtrage éthique** (MoralLayer)
- **Sanitization** sur l'export enterprise (module dormant côté API)

**Réserve** : Helmet, CORS, JWT et rate-limit global ne sont **pas** branchés sur `server.js`.

---

## 2. TrustContext

### 2.1 Rôle

`src/core/TrustContext.js` — approbations humaines signées pour décisions critiques.

| Concept | Détail |
| --- | --- |
| Niveaux criticité | `low` → `critical` (`CriticalityLevel`) |
| Seuil approbation | `minApprovalLevel` défaut HIGH |
| Timeout | 30 minutes |
| Gouvernance | Rôles `lead`, `security`, `owner` (`governancePolicy`) |
| Réponse HTTP | 403 si décision non approuvée |

### 2.2 Déclenchement

Via `HybridOrchestrator` et `voiceChatController` :

- `taskType === 'critical'`
- Mots-clés : `DELETE`, `SHUTDOWN`, `RESET`, `DESTROY`, `FORMAT`

### 2.3 Signatures

Approbations signées Ed25519. Registre de clés : `KeyRegistry` → `data/key-registry.json`.

Documentation : [TRUSTCONTEXT_KEY_MANAGEMENT.md](../TRUSTCONTEXT_KEY_MANAGEMENT.md), [TRUSTCONTEXT_GOVERNANCE.md](../TRUSTCONTEXT_GOVERNANCE.md).

---

## 3. Consensus fail-closed

`ConsensusManager` valide chaque proposition via schémas Zod (`src/security/contracts/consensus.js`).

Comportement observé :

- Rejet si schéma invalide (fail-closed)
- Gestion `abstain` / `unavailable` des providers
- Escalade TrustContext sur timeout consensus

Tests : property-based `__tests__/properties/consensus.properties.test.ts` (7 tests, invariants quorum, monotonicité, déterminisme).

---

## 4. Audit tamper-evident

| Mécanisme | Détail |
| --- | --- |
| Format | JSONL chaîné |
| Hash | SHA-256 (`prevHash` → `hash`) |
| Signature | Ed25519 PEM (pkcs8/spki) |
| Vérification | `TamperEvidentAuditLog.verify()` |
| Emplacement | `data/audit/` |

Complément HMAC : `SecureJournalManager` (coexistence à clarifier en exploitation).

Documentation : [AUDIT_LOG_TAMPER_EVIDENT.md](../AUDIT_LOG_TAMPER_EVIDENT.md).

---

## 5. MoralLayer

### 5.1 Rôle

`infrastructure/moralLayer.js` — analyse et filtrage éthique du contenu dans le pipeline `TaskTypeProcessor`.

### 5.2 Catégories

Violence, haine, politique, santé mentale, croyances, contenu émotionnel, etc.

### 5.3 Actions

| Statut | Action |
| --- | --- |
| Bloqué | Rejet immédiat |
| Surveillé | Log + marquage |
| Accepté | Traitement normal |

### 5.4 Logs

- `logs/moralLayerAudit/blocked.log`
- `logs/moralLayerAudit/monitored.log`

**Documentation complète** : [moralLayer.md](../moralLayer.md) — ce document ne duplique pas les règles de filtrage détaillées.

---

## 6. Sanitization et validation

### 6.1 Export enterprise (dormant API)

| Composant | Rôle |
| --- | --- |
| `EnterpriseSanitizer` | Suppression emojis, contenu casual |
| `validateEnterpriseExportRequest` | Validation Joi |
| `csrfProtection` | Token CSRF |
| `enterpriseExportRateLimit` | Rate-limit dédié |
| `sanitizeInput` | Nettoyage entrées |

Actifs dans `backend/routes/enterpriseExport.js` — **non exposés** par `server.js` par défaut.

### 6.2 Upload fichiers

`backend/middleware/fileUpload.js` :

- Validation type MIME / extension Excel-CSV
- Rate-limit upload
- Multer avec limites taille

### 6.3 Chat

Validation implicite dans `voiceChatController` (corps JSON, messages requis pour endpoints dédiés).

---

## 7. Gestion des secrets

| Mesure | Détail |
| --- | --- |
| Template | `.env.example` (53 variables placeholder) |
| Gitignore | `.env`, `.env.*` refusés ; whitelist `!.env.example` |
| Historique | Purge secrets PRISM_04 / PRISM_04B — voir `docs/valuation/` |
| `.npmrc` | `legacy-peer-deps=true` |

**Règle** : ne jamais committer de clés API réelles.

Registre complet : [PRISM_03_SECRET_AND_ENV_REGISTER.md](../valuation/PRISM_03_SECRET_AND_ENV_REGISTER.md).

---

## 8. Sécurité HTTP — dette documentée

| Mécanisme | Dépendance | Statut sur `server.js` |
| --- | --- | --- |
| Helmet | `helmet@^8.1.0` | **Non utilisé** |
| CORS | `cors@^2.8.5` | **Non configuré** |
| JWT | `jsonwebtoken@^9.0.2` | **Pas de middleware** |
| Rate-limit global | `express-rate-limit` | Uniquement export enterprise |
| Morgan | `morgan` | **Non branché** |
| `x-powered-by` | Express | Désactivé (`app.disable`) |

En production, un **reverse-proxy** (TLS, WAF, auth) est attendu en amont — non fourni dans le repo.

---

## 9. Chiffrement

| Domaine | Statut |
| --- | --- |
| Signatures audit | Ed25519 |
| Journal HMAC | SecureJournalManager |
| At-rest (SQLite, JSONL) | **Non chiffré** documenté |
| TLS Express | **Non configuré** |
| HSM / KMS | **Absent** |

---

## 10. Conformité et menaces

| Sujet | Statut documenté |
| --- | --- |
| RGPD | Non documenté — à confirmer |
| AI Act | Non documenté — à confirmer |
| SOC2 | Mentionné comme cible roadmap README, non démontré |
| Modèle de menaces | [THREAT_MODEL_MINI.md](../THREAT_MODEL_MINI.md) |
| Pentest | [Pentest_Plan.md](../Pentest_Plan.md) |

---

## 11. Multi-tenant et authentification utilisateur

- **Pas de schéma multi-tenant** observable.
- **Pas d'authentification utilisateur** HTTP sur les routes chat.
- Contrôle d'accès limité à la gouvernance TrustContext (décisions critiques).

---

## 12. Documents liés

- [moralLayer.md](../moralLayer.md)
- [AUDIT_LOG_TAMPER_EVIDENT.md](../AUDIT_LOG_TAMPER_EVIDENT.md)
- [TRUSTCONTEXT_KEY_MANAGEMENT.md](../TRUSTCONTEXT_KEY_MANAGEMENT.md)
- [THREAT_MODEL_MINI.md](../THREAT_MODEL_MINI.md)
- [SECURITY_PROOF_MVP.md](../SECURITY_PROOF_MVP.md)
- [PROJECT_DOCUMENTATION_STANDARD.md](../audit/PROJECT_DOCUMENTATION_STANDARD.md) §8
