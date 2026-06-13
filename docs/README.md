# Documentation PRISM — Index

**PRISM** (Professional AI Intelligence System Matrix) — orchestration multi-modèles avec consensus, audit cryptographique et gouvernance TrustContext.

**Version package** : `2.0.0` (`package.json`)  
**Statut maturité** : TRL 4 avancé, démonstration partielle TRL 5 en staging contrôlé interne — voir [PRISM_02A_TRL_CLAIM_AUDIT.md](./valuation/PRISM_02A_TRL_CLAIM_AUDIT.md).

---

## 1. Par public

### Utilisateurs et exploitation

| Document | Description |
| --- | --- |
| [Premiers pas](./user/GETTING_STARTED.md) | Installation, configuration `.env`, démarrage, interfaces |
| [Guide utilisateur](./user/USER_GUIDE.md) | Chat vocal, consensus, exports, personas, limites |
| [FAQ](./user/FAQ.md) | Clés API, erreurs courantes, limites honnêtes |

### Architecture et technique

| Document | Description |
| --- | --- |
| [Vue d'ensemble](./architecture/OVERVIEW.md) | Couches, flux requête → réponse |
| [Modules cœur](./architecture/CORE_MODULES.md) | ConsensusManager, TrustContext, MoralLayer, statuts prod/dormant |
| [Données et intégrations](./architecture/DATA_AND_INTEGRATIONS.md) | SQLite, providers, Supabase, observabilité |
| [Sécurité](./architecture/SECURITY.md) | TrustContext, sanitization, secrets, MoralLayer |

### Développeurs

| Document | Description |
| --- | --- |
| [Développement](./developer/DEVELOPMENT.md) | Setup, scripts npm, tests Vitest, lint, Husky |
| [Contribution](./developer/CONTRIBUTING.md) | Conventions, quality gates, PR |
| [Référence API](./developer/API_REFERENCE.md) | Routes HTTP exposées par `server.js` |

---

## 2. Documentation audit et valorisation (existante)

Documents produits dans le cadre du dossier cabinet Diag & Grow. **Ne pas modifier** les rapports `PRISM_0*.md` sans validation explicite.

| Dossier / fichier | Rôle |
| --- | --- |
| [audit/PROJECT_DOCUMENTATION_STANDARD.md](./audit/PROJECT_DOCUMENTATION_STANDARD.md) | Référence technique standardisée (cabinet) |
| [audit/PROJECT_AUDIT_NOTES.md](./audit/PROJECT_AUDIT_NOTES.md) | Méthode et compléments d'audit |
| [audit/DOCUMENTATION_GAP_AUDIT.md](./audit/DOCUMENTATION_GAP_AUDIT.md) | Audit écarts doc + plan de rédaction |
| [valuation/](./valuation/) | Suite PRISM_02A → PRISM_04B (TRL, secrets, hygiène repo) |
| [reports/TRL5_PROOF_REPORT.md](./reports/TRL5_PROOF_REPORT.md) | Scénarios TrustContext S1–S6 (démo interne) |
| [PRISM_TRL_ASSESSMENT.md](./PRISM_TRL_ASSESSMENT.md) | Évaluation TRL interne |

---

## 3. Documentation technique complémentaire

| Document | Sujet |
| --- | --- |
| [QUALITY.md](./QUALITY.md) | Quality gates, stratégie de tests |
| [moralLayer.md](./moralLayer.md) | MoralLayer — analyse éthique du contenu |
| [AUDIT_LOG_TAMPER_EVIDENT.md](./AUDIT_LOG_TAMPER_EVIDENT.md) | Journal JSONL chaîné Ed25519 |
| [TRUSTCONTEXT_KEY_MANAGEMENT.md](./TRUSTCONTEXT_KEY_MANAGEMENT.md) | Registre clés Ed25519 |
| [EXCEL_ANALYSIS_MODULE.md](./EXCEL_ANALYSIS_MODULE.md) | Upload et analyse Excel dans le chat |
| [OBS_Dashboards.md](./OBS_Dashboards.md) | Dashboards Grafana |
| [deployment.md](./deployment.md) | Déploiement (complément ops) |
| [THREAT_MODEL_MINI.md](./THREAT_MODEL_MINI.md) | Modèle de menaces (MVP) |

> **Note** : `docs/ARCHITECTURE.md`, `docs/installation.md` et `docs/usage.md` sont des documents historiques (vision « Jarvis Core » / UI particules). La documentation produit actuelle est sous `docs/user/` et `docs/architecture/`.

---

## 4. Démarrage rapide

```bash
git clone https://github.com/Makk7709/P.R.I.S.M.git
cd P.R.I.S.M
npm install
cp .env.example .env   # puis renseigner les clés API
npm start
```

Interface corporate : `http://localhost:3000/ui/prismVoiceChatV2-Corporate.html`

Voir [GETTING_STARTED.md](./user/GETTING_STARTED.md) pour le détail.

---

## 5. Liens externes

- Dépôt : [github.com/Makk7709/P.R.I.S.M](https://github.com/Makk7709/P.R.I.S.M)
- README racine (vue investisseur / TRL) : [../README.md](../README.md)
- Licence : [AGPL v3](../LICENSE)
