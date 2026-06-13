# Guide de contribution — PRISM

**Public cible** : contributeurs externes et internes.  
**Objectif** : conventions, processus PR et quality gates. Complète `docs/contributing.md` (historique UI particules).

---

## 1. Avant de contribuer

### 1.1 Prérequis

- JavaScript ES Modules (Node.js ≥ 16)
- Familiarité Express, Vitest, Git
- Lecture de [DEVELOPMENT.md](./DEVELOPMENT.md) pour le setup

### 1.2 Licence

Contributions soumises sous **AGPL v3** — voir [LICENSE](../../LICENSE). Usage commercial : contacter le porteur du projet.

---

## 2. Workflow Git

### 2.1 Branches

```bash
git checkout -b feat/description-courte
# ou
git checkout -b fix/description-bug
```

### 2.2 Commits

Format recommandé (Conventional Commits) :

```text
type(scope): description courte

Corps optionnel expliquant le pourquoi.
```

| Type | Usage |
| --- | --- |
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction bug |
| `docs` | Documentation seule |
| `refactor` | Refactoring sans changement comportement |
| `test` | Ajout ou correction tests |
| `chore` | Maintenance, dépendances |

### 2.3 Avant PR

```bash
npm run format:check
npm run lint
npm test                    # 219 tests — obligatoire
npm run test:properties     # si modification consensus/audit/contracts
```

---

## 3. Quality gates

### 3.1 Pre-commit (Husky)

Automatique à chaque commit :

1. lint-staged (format + lint)
2. typecheck (warnings seulement)
3. **npm test** (bloquant)

### 3.2 CI (GitHub Actions)

| Check | Bloquant |
| --- | --- |
| Format | Oui |
| Lint | Oui |
| Typecheck | Non (warnings) |
| Core tests | Oui |
| Property tests | Oui |
| Legacy tests | Non (quarantaine) |

Référence complète : [QUALITY.md](../QUALITY.md).

---

## 4. Standards de code

### 4.1 Style

- Suivre le style existant du fichier modifié
- ESLint + Prettier obligatoires
- ES Modules (`import` / `export`) — pas de mix CJS sauf zones existantes (`.cjs`, `createRequire`)

### 4.2 Principes

- **Minimiser la portée** — un correctif focalisé vaut mieux qu'un refactor large
- **Réutiliser** les modules existants (`ConsensusManager`, adapters, etc.)
- **Ne pas sur-promettre** dans la documentation — aligner sur TRL 4 avancé
- Commentaires : uniquement pour logique non évidente

### 4.3 Fichiers sensibles

| Fichier | Règle |
| --- | --- |
| `.env` | Ne jamais committer |
| `docs/valuation/PRISM_0*.md` | Ne pas modifier sans validation |
| `data/key-registry.json` | Clés locales — gitignored si secrets |

---

## 5. Tests

### 5.1 Obligation

Tout changement sur les modules core doit maintenir **219/219** tests `npm test`.

### 5.2 Types de tests attendus

| Zone modifiée | Tests à considérer |
| --- | --- |
| ConsensusManager | `__tests__/properties/consensus.properties.test.ts` |
| TrustContext | `__tests__/properties/trustContext.properties.test.ts` |
| Contrats Zod | `__tests__/fuzz/contracts.fuzz.test.ts` |
| Providers | `__tests__/properties/providers.properties.test.ts` |
| Routes API | Supertest dans `__tests__/` ou tests dédiés |

### 5.3 Property-based

Utiliser `fast-check` pour les invariants critiques (quorum, monotonicité, déterminisme).

### 5.4 Tests legacy

`npm run test:legacy` — informatif, non bloquant. Ne pas casser davantage sans plan de correction.

---

## 6. Documentation

### 6.1 Mise à jour doc

Si le changement affecte :

- routes HTTP → [API_REFERENCE.md](./API_REFERENCE.md)
- setup / env → [GETTING_STARTED.md](../user/GETTING_STARTED.md)
- comportement utilisateur → [USER_GUIDE.md](../user/USER_GUIDE.md)
- architecture → `docs/architecture/`

### 6.2 Langue

Documentation produit en **français**. Termes techniques EN conservés (Express, Vitest, TRL).

### 6.3 Markdown

- Lignes vides autour des titres et listes
- Blocs code avec langage (`bash`, `json`, `javascript`)
- Tables alignées (markdownlint-friendly)

---

## 7. Pull Request

### 7.1 Contenu attendu

- Description du **pourquoi** (pas seulement le quoi)
- Référence issue si applicable
- Checklist tests exécutés
- Mention des limites / régressions connues

### 7.2 Revue

- Un mainteneur valide le respect des quality gates CI
- Les changements sur modules « gelés » (`frozen-modules.yml`) nécessitent attention

### 7.3 Ce qui bloque une merge

- Échec `npm test` ou `npm run format:check` ou `npm run lint`
- Secrets dans le diff
- Documentation contradictoire avec le code (routes inventées, ports faux)

---

## 8. Zones à risque

| Zone | Risque |
| --- | --- |
| `src/core/ConsensusManager.js` | Module gelé — invariants prouvés |
| `src/core/TrustContext.js` | Complexité élevée — tests regression |
| `src/audit/TamperEvidentAuditLog.js` | Format audit — rétrocompatibilité |
| `server.js` | Point d'entrée — tester routes manuellement |
| Montage `enterpriseExportRouter` | Bug latent connu — documenter si corrigé |

---

## 9. Ressources

| Document | Sujet |
| --- | --- |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Setup et scripts |
| [API_REFERENCE.md](./API_REFERENCE.md) | Routes HTTP |
| [QUALITY.md](../QUALITY.md) | Quality contract |
| [FAQ](../user/FAQ.md) | Limites produit |
| [PROJECT_DOCUMENTATION_STANDARD.md](../audit/PROJECT_DOCUMENTATION_STANDARD.md) | Référence audit |

---

## 10. Contact

- Issues : [GitHub Issues](https://github.com/Makk7709/P.R.I.S.M/issues)
- Sécurité : responsable disclosure — pas de clés dans les issues publiques
- Product Owner : Amine Mohamed (cf. README racine)
