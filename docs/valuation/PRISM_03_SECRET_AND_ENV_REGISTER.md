# PRISM_03 / PRISM_03B — Secret and Env Register

**Date de revue initiale (PRISM_03) :** 2026-05-15 (sur HEAD pré-purge `4a05a4f`)
**Date de revue post-purge (PRISM_03B) :** 2026-05-15 (sur HEAD post-purge `fdc3aa7`)
**Repo audité :** `Makk7709/P.R.I.S.M`
**Branche :** `main`
**Auditeur :** Revue de securite interne (CTO sécurité + auditeur hygiène Git + commissaire aux apports prudent)

---

## 0. Règle absolue de masquage

Aucune valeur de secret n'est reproduite intégralement dans ce registre. Toute clé détectée est masquée sous une forme `<préfixe-court>...REDACTED...`. La lecture des valeurs complètes a été effectuée uniquement pour qualification et n'est consignée nulle part dans la documentation.

---

## 1. Verdict exécutif sécurité — état courant PRISM_03B

> **Statut courant (post-purge + alignement tags + rotation providers) :**
> ✅ **PROPRE.** Plus aucun secret réel n'est tracké, plus aucun secret n'est accessible via les refs distantes du repo canonique (`main` + 14 tags GitHub).

| Indicateur                                                             | État courant (PRISM_03B)                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Au moins une clé d'API réelle trackée                                  | ❌ **NON** (les 6 sources historiques ont été éliminées par `PRISM_04`)                                           |
| Secrets accessibles via `refs/heads/main`                              | ✅ **0** (`PRISM_04` §3, vérifié sur ≈84 MB de blobs)                                                             |
| Secrets accessibles via `refs/tags/*` (14 tags)                        | ✅ **0** (`PRISM_04B` §3, vérifié sur ≈740 MB de blobs)                                                           |
| Présence d'un `.env` réel tracké                                       | ❌ Non                                                                                                            |
| Présence de fichiers `.env*` trackés (placeholders ou config publique) | ❌ Plus aucun (4 retirés du tracking en PRISM_03B, fichiers conservés sur disque)                                 |
| Clé privée Ed25519 / RSA / OpenSSH trackée                             | ❌ Non (uniquement clé publique de test)                                                                          |
| Rotation humaine confirmée auprès des providers                        | ✅ Confirmé par l'humain (OpenAI, Anthropic, Supabase, Perplexity, ElevenLabs) au lancement de `PRISM_04` Phase 1 |
| Satellite `prism-lite-DICA-ui-ux-design` à traiter hors périmètre      | ⚠ Toujours à traiter via `PRISM_04C` (rappel `PRISM_01`)                                                          |

### Note historique — Verdict initial PRISM_03 (avant purge)

À la date du 2026-05-15 sur HEAD `4a05a4f`, ce registre concluait :

- ⛔ **BLOCKER CRITIQUE.**
- **6 secrets réels trackés dans Git :** 5 dans `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` + 1 ligne 101 de `.gitignore`.
- **Décision :** Ne pas committer sans décision humaine. Rotation immédiate des clés détectées + purge historique requise.

Ce blocker a été levé par la séquence :

1. `PRISM_04_SECRET_PURGE_HISTORY_AND_ROTATION` — rotation humaine des 5 clés providers, puis `git filter-repo` (purge + remplacement), puis `git push --force-with-lease origin main`.
2. `PRISM_04B_REMOTE_TAGS_SANITY_AFTER_SECRET_PURGE` — alignement des 11 tags GitHub qui pointaient encore vers la chaîne contaminée.
3. `PRISM_03B_REAPPLY_HYGIENE_AFTER_SECRET_PURGE` — réapplication de l'hygiène initiale sur la chaîne propre.

---

## 2. Inventaire principal — mis à jour PRISM_03B

| #   | Source                                       | Fichier (état courant)                                 | Tracké Git ?                           | Secret réel ? | Type                                                                                                                                                        | Action effectuée                                                                          | Statut courant              |
| --- | -------------------------------------------- | ------------------------------------------------------ | -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Doc d'audit historique                       | `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md`          | ❌ **N'existe plus** dans aucun commit | n/a           | OpenAI `sk-proj-...REDACTED` (historique)                                                                                                                   | `PRISM_04` `git filter-repo --invert-paths` (96 commits) + rotation provider              | ✅ **RÉSOLU**               |
| 2   | Doc d'audit historique                       | idem                                                   | ❌ N'existe plus                       | n/a           | Anthropic `sk-ant-api0-...REDACTED` (historique)                                                                                                            | idem + rotation provider                                                                  | ✅ **RÉSOLU**               |
| 3   | Doc d'audit historique                       | idem                                                   | ❌ N'existe plus                       | n/a           | Supabase JWT `eyJhbGc...REDACTED` (historique)                                                                                                              | idem + rotation provider                                                                  | ✅ **RÉSOLU**               |
| 4   | Doc d'audit historique                       | idem                                                   | ❌ N'existe plus                       | n/a           | Perplexity `pplx-lmtC...REDACTED` (historique)                                                                                                              | idem + rotation provider                                                                  | ✅ **RÉSOLU**               |
| 5   | Doc d'audit historique                       | idem                                                   | ❌ N'existe plus                       | n/a           | ElevenLabs `sk_4702...REDACTED` (historique)                                                                                                                | idem + rotation provider                                                                  | ✅ **RÉSOLU**               |
| 6   | `.gitignore` ligne 101 (à HEAD `4a05a4f`)    | `.gitignore` (à HEAD `fdc3aa7` puis post-PRISM_03B)    | ✅ Oui mais **purgé**                  | n/a           | OpenAI `sk-proj-...REDACTED` remplacé par `REMOVED_SECRET` dans 203 commits historiques, puis fichier entièrement réécrit en PRISM_03B (147 lignes durcies) | `PRISM_04` `git filter-repo --replace-text` + `PRISM_03B` remplacement complet du fichier | ✅ **RÉSOLU**               |
| 7   | Fichier config                               | `.env.performance` (encore sur disque)                 | ❌ Retiré du tracking en PRISM_03B     | n/a           | Drapeaux performance + `OPENAI_MODEL=gpt-3.5-turbo` (non secret)                                                                                            | `git rm --cached .env.performance`                                                        | ✅ Hors tracking, ignoré    |
| 8   | Fichier config                               | `prism-turbo.env` (encore sur disque)                  | ❌ Retiré du tracking                  | n/a           | Drapeaux turbo (non secret)                                                                                                                                 | `git rm --cached prism-turbo.env`                                                         | ✅ Hors tracking            |
| 9   | Fichier test                                 | `test.env` (encore sur disque)                         | ❌ Retiré du tracking                  | n/a           | Placeholders `test_*_placeholder` (non secret)                                                                                                              | `git rm --cached test.env`                                                                | ✅ Hors tracking            |
| 10  | Fichier template                             | `asi-config.env` (encore sur disque)                   | ❌ Retiré du tracking                  | n/a           | Placeholders `your_<vendor>_api_key_here` (non secret)                                                                                                      | `git rm --cached asi-config.env`                                                          | ✅ Hors tracking            |
| 11  | Template historique                          | `env.example` (encore tracké, **renommer recommandé**) | ✅ Oui                                 | n/a           | Placeholders `your_<vendor>_api_key_here` (non secret)                                                                                                      | Conservé tel quel, doublonné par `.env.example` créé en PRISM_03B                         | ⚠ À consolider hors mission |
| 12  | Test script                                  | `test-elevenlabs-real-key.js`                          | ✅ Oui                                 | ❌ Non        | Lecture `process.env.ELEVENLABS_API_KEY` seulement                                                                                                          | Aucune                                                                                    | ✅ OK                       |
| 13  | Test script                                  | `test-simple-key.js`                                   | ✅ Oui                                 | ❌ Non        | Lecture `process.env.ELEVENLABS_API_KEY` seulement                                                                                                          | Aucune                                                                                    | ✅ OK                       |
| 14  | Test asset                                   | `test-audit-manual/keys/test-key.pub`                  | ✅ Oui                                 | ❌ Non        | Clé Ed25519 **publique** de test                                                                                                                            | Aucune (publique par nature)                                                              | ✅ OK                       |
| 15  | KeyRegistry vide                             | `data/key-registry.json`                               | ✅ Oui                                 | ❌ Non        | `{ "keys": {} }`                                                                                                                                            | Aucune (hash-chain runtime)                                                               | ✅ OK                       |
| 16  | Local non tracké                             | `.env`, `.env.local`, `.env.production`                | ❌ Non                                 | n/a           | Absents physiquement, désormais formellement interdits par le nouveau `.gitignore` (`.env*` whitelist)                                                      | Aucune                                                                                    | ✅ OK                       |
| 17  | Template canonique (créé PRISM_03B)          | `.env.example`                                         | ✅ Oui                                 | ❌ Non        | 53 variables `process.env.*` avec valeurs vides + warning « DO NOT COMMIT REAL KEYS »                                                                       | Création                                                                                  | ✅ OK                       |
| 18  | Config npm reproductibilité (créé PRISM_03B) | `.npmrc`                                               | ✅ Oui                                 | ❌ Non        | `legacy-peer-deps=true` (zod v3/v4 conflict workaround)                                                                                                     | Création                                                                                  | ✅ OK                       |

**Total clés réelles encore trackées dans Git (post-PRISM_03B) : 0.**
**Total clés réelles accessibles via refs distantes (main + 14 tags) : 0.**

---

## 3. Détail historique des BLOCKERS — résolution PRISM_04

### 3.1 `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` — RÉSOLU

- **Introduit dans :** commit `63fdb50` du 2025-09-02 (`🔧 AUDIT & FIX: Configuration complète des clés API`, auteur Amine Mohamed).
- **Modifications ultérieures :** aucune. Le fichier est apparu une seule fois et n'a jamais été nettoyé manuellement avant `PRISM_04`.
- **Présent à HEAD avant `PRISM_04` :** ✅ oui, à `4a05a4f`.
- **Contenu sensible historique (masqué, conservé pour traçabilité auditeur) :**
  - Ligne 40 : `OPENAI_API_KEY=sk-proj-...REDACTED`
  - Ligne 44 : `ANTHROPIC_API_KEY=sk-ant-api0-...REDACTED`
  - Ligne 49 : `SUPABASE_API_KEY=eyJhbGc...REDACTED` (JWT)
  - Ligne 52 : `PERPLEXITY_API_KEY=pplx-lmtC...REDACTED`
  - Ligne 55 : `ELEVENLABS_API_KEY=sk_4702...REDACTED`
- **Action `PRISM_04` :** `git filter-repo --invert-paths --path SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` (96 commits affectés). Le fichier ne figure plus dans aucun commit accessible via `refs/heads/main` ou `refs/tags/*`.
- **Vérification :** `git rev-list --objects refs/heads/main` post-purge ne fait plus apparaître ce blob ; scan binaire sur 84 MB de blobs `main` + 740 MB de blobs tags = 0 hit.

### 3.2 `.gitignore` ligne 101 — RÉSOLU

- **Fichier :** `.gitignore` (suivi par Git, normal).
- **Ligne 101 historique (masquée) :** `OPENAI_API_KEY=sk-proj-...REDACTED`
- **Ligne 102 (non sensible) :** `OPENAI_MODEL=gpt-4-turbo`
- **Origine probable :** paste accidentel dans `.gitignore` à la place de `.env`.
- **Action `PRISM_04` :** `git filter-repo --replace-text` avec un fichier de remplacement temporaire (jamais committé, jamais affiché en clair, supprimé à fin de mission). 203 commits historiques affectés ; la valeur a été remplacée par `REMOVED_SECRET` partout.
- **Action `PRISM_03B` (en plus) :** Le fichier `.gitignore` entier a été remplacé par la version durcie 147 lignes ; il n'y a plus de ligne `OPENAI_API_KEY=...` du tout dans le working tree commité.

### 3.3 Tags GitHub — RÉSOLU par PRISM_04B

- **Constat post-PRISM_04 :** 11 des 14 tags GitHub pointaient encore vers la chaîne pré-purge contaminée, alors même que `main` était propre. Vérifié empiriquement : `v3.0.0` et `v0.2.0-trl5-proof-pack` côté distant servaient toujours l'ancien `.gitignore` avec la clé OpenAI complète.
- **Action `PRISM_04B` :** Re-push tag par tag avec `git push --force-with-lease=refs/tags/<TAG>:<OLD_REMOTE_SHA>` pour chacun des 11 tags divergents (jamais `--tags` aveugle, jamais `--force` simple).
- **Vérification post-push :** 14/14 tags alignés, scan 0 secret sur le sweep complet des blobs accessibles via `refs/tags/*`.

### 3.4 Notes complémentaires

- La clé OpenAI de `.gitignore` (ancien #6) et celle de `SESSION_AUDIT_API_KEYS_*.md` (ancien #1) ont le **même préfixe `sk-proj-`** et appartiennent vraisemblablement au même compte OpenAI. Une rotation a couvert les deux côté provider.
- Les autres clés (Anthropic, Supabase, Perplexity, ElevenLabs) requéraient chacune une rotation indépendante ; l'humain a confirmé les 5 rotations au lancement de `PRISM_04` Phase 1.
- La purge a été coordonnée par un `git push --force-with-lease origin main` après scan post-purge. Forks publics et clones locaux contributeurs restent à traiter par communication (cf. risques résiduels).

---

## 4. Rappel externe — satellites hors périmètre

Le repo `prism-lite-DICA-ui-ux-design` (audit `PRISM_01`) contient déjà une fuite documentée :

- Clé OpenAI réelle exposée.
- Clé ElevenLabs réelle exposée.

Action requise **hors périmètre PRISM_03** :

- `PRISM_04_SECRET_PURGE_SATELLITE_REPOS` ou rebrancher la rotation dans une mission dédiée multi-repo.
- Le processus d'audit ne peut pas révoquer les clés côté fournisseur. Seul l'utilisateur doit le faire.

---

## 5. Actions humaines requises — état courant

### 5.1 Actions historiques (PRISM_04) — ✅ EFFECTUÉES

1. **Rotation fournisseurs des 5 secrets** ✅ Confirmée par l'humain au lancement de `PRISM_04` Phase 1 :
   - OpenAI (`sk-proj-...`)
   - Anthropic (`sk-ant-api0-...`)
   - Supabase (Service Role JWT)
   - Perplexity (`pplx-...`)
   - ElevenLabs (`sk_...`)
2. **Purge historique Git** ✅ Effectuée par `PRISM_04` via `git filter-repo`.
3. **Re-scan post-purge** ✅ Confirmé : 0 hit sur `refs/heads/main` (`PRISM_04`) et 0 hit sur `refs/tags/*` (`PRISM_04B`).

### 5.2 Actions résiduelles (à effectuer hors perimetre d'audit)

1. **Surveillance dashboards providers** pendant 30 jours suivant `PRISM_04` (2026-05-15) : tracer toute tentative d'usage des anciennes clés sur OpenAI, Anthropic, Supabase, Perplexity, ElevenLabs.
2. **Communication aux contributeurs** : tout clone local antérieur au `2026-05-15 21:32` (heure du force-push PRISM_04) doit être ré-cloné ou réinitialisé strictement (`git fetch origin && git reset --hard origin/main && git fetch origin --tags --prune --prune-tags`).
3. **Audit des forks publics** via GitHub API (mission optionnelle `PRISM_04C_FORK_AUDIT`).
4. **Repo satellite `prism-lite-DICA-ui-ux-design`** : rotation + purge toujours à effectuer (cf. `PRISM_01` ; mission `PRISM_04C_SATELLITE_PURGE`).

---

## 6. Variables d'environnement réellement utilisées dans le code (Phase 5 input)

Source : `grep -RnoE 'process\.env\.[A-Z0-9_]+'` sur `*.js`, `*.mjs`, `*.cjs`, `*.ts`, `*.tsx` hors `node_modules`, `.venv`, `dashboard`, `.next`, `coverage`, `test-trustcontext-temp`.

**Total : 53 variables uniques** (cf. `.env.example` produit en Phase 5).

Variables sensibles (clés API détectées dans le code) :
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_API_KEY`, `FAL_API_KEY`, `FAL_KEY`, `NANOBANANA_API_KEY`.

Variables d'infrastructure : `PORT`, `NODE_ENV`, `DATABASE_PATH`, `METRICS_PORT`, `PROMETHEUS_PORT`, `TRUSTCONTEXT_KEYREGISTRY_PATH`, `ALERT_WEBHOOK_URL`, `PRISM_*`, `ASI_*`, etc.

---

## 7. Décision — état courant

### 7.1 Décision initiale PRISM_03 (historique)

> **la phase avait ete haltee la phase 11 (commit) de la mission `PRISM_03_REPO_HYGIENE_CLEANUP` initiale conformément à la consigne « ne pas continuer vers commit sans décision humaine » dès qu'un secret réel est tracké.**
>
> les phases avaient neanmoins ete exécuté les phases 2 à 10 (durcissement `.gitignore`, retrait du tracking des artefacts non valorisables, création de `.env.example`, tentative `npm ci`, constat typecheck, tests, contrôles finaux). Le résultat était laissé en index local et sauvegardé dans `/tmp/prism_03_hygiene_backup/` pour usage ultérieur post-purge.

### 7.2 Décision courante PRISM_03B (committed)

Après que `PRISM_04` ait éliminé les 6 secrets historiques et que `PRISM_04B` ait aligné les tags GitHub, l'hygiène PRISM_03 a été réappliquée par `PRISM_03B` et **committée + poussée sur `main`** sans `--no-verify`, le pre-commit hook ayant passé tous les contrôles (lint, format, test 76/76).

---

## 8. Delta depuis PRISM_03 initial

| Élément                                | PRISM_03 initial                          | PRISM_03B (courant)                                                                |
| -------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| HEAD audité                            | `4a05a4f`                                 | `fdc3aa7` (puis le commit PRISM_03B au-dessus)                                     |
| Secrets réels trackés                  | 6                                         | 0                                                                                  |
| Secrets accessibles via refs distantes | 6 (main) + même historique via 11/14 tags | 0 (main) + 0 (14/14 tags)                                                          |
| Rotation providers                     | Non confirmée                             | ✅ Confirmée pour les 5 clés (OpenAI, Anthropic, Supabase, Perplexity, ElevenLabs) |
| `.gitignore` working tree              | Ligne 101 contenait `sk-proj-...`         | Aucune ligne contenant un pattern secret ; fichier durci 147 lignes                |
| `SESSION_AUDIT_API_KEYS_*.md`          | Tracké, 5 clés réelles                    | N'existe plus dans aucun commit du repo canonique                                  |
| `.env*` config trackés                 | 5 fichiers (placeholders + config)        | 0 (4 retirés, 1 doublon `env.example` à consolider hors mission)                   |
| `.env.example` canonique               | À créer                                   | ✅ Créé, 53 vars placeholder                                                       |
| `.npmrc` reproductibilité              | À créer                                   | ✅ Créé, `legacy-peer-deps=true`                                                   |
| Commit PRISM_03                        | HALTED                                    | ✅ PRISM_03B committed + poussé                                                    |

---

**Fin du registre.**
