# PRISM_04 — Secret Purge History and Rotation Report

**Mission :** `PRISM_04_SECRET_PURGE_HISTORY_AND_ROTATION`
**Date :** 2026-05-15
**Personae :** incident responder sécurité + expert Git history rewrite + CTO sécurité + commissaire aux apports prudent
**Repo :** `Makk7709/P.R.I.S.M`
**Branche :** `main`

---

## 1. Verdict exécutif

| Item                                | État                                                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repo                                | `Makk7709/P.R.I.S.M`                                                                                           |
| Branche                             | `main`                                                                                                         |
| HEAD avant purge                    | `4a05a4fbfd981054162dc8477723a8c97f923173`                                                                     |
| HEAD après purge                    | `c5fd9ed3f56e319d55a5fe9321dcc0fb0bf85406`                                                                     |
| Commits réécrits                    | 254 → 253 (1 commit devenu vide après suppression du fichier contaminé : ex-`63fdb50` du 2025-09-02)           |
| Tags réécrits par `git filter-repo` | ✅ 17 tags pointent désormais sur la nouvelle chaîne                                                           |
| Rotation fournisseurs confirmée     | ✅ Oui (5/5 : OpenAI, Anthropic, Supabase, Perplexity, ElevenLabs — confirmation humaine explicite 2026-05-15) |
| Purge historique effectuée          | ✅ Oui (2 passes `git filter-repo`)                                                                            |
| Vérification post-purge             | ✅ 0 occurrence des patterns secrets, 0 commit contient le fichier contaminé                                   |
| Rapport `PRISM_04` créé             | ✅ Présent fichier                                                                                             |
| Commit créé                         | ⏳ à venir Phase 10                                                                                            |
| Force-push effectué                 | ⏳ à venir Phase 11 (`--force-with-lease`)                                                                     |
| Diff `PRISM_03` réappliqué          | ❌ Non — laissé hors scope, mission `PRISM_03B` recommandée                                                    |

### Verdict final : ✅ **Purge historique réussie sur `refs/heads/main`, prête pour `--force-with-lease`.**

---

## 2. Secrets concernés (sans valeur complète)

| #   | Type                                                                | Fichier source                                         | Commit d'origine                                                         | Rotation fournisseur confirmée           | Purge historique                                      |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------- |
| 1   | OpenAI `sk-proj-...REDACTED...` (≈165 chars, full key)              | `.gitignore` ligne 101                                 | `f3d15a3` (2025-04-27) — propagé dans 203 commits jusqu'à HEAD `4a05a4f` | ✅ Oui                                   | ✅ Remplacé par `REMOVED_SECRET` via `--replace-text` |
| 2   | OpenAI `sk-proj-...REDACTED...` (≈47 chars, prefix tronqué `xx...`) | `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` ligne 40 | `63fdb50` (2025-09-02) — propagé dans 96 commits                         | ✅ Oui (même compte que #1 probablement) | ✅ Fichier supprimé via `--invert-paths` (96 commits) |
| 3   | Anthropic `sk-ant-api0-...REDACTED...` (≈41 chars, prefix tronqué)  | `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` ligne 44 | `63fdb50`                                                                | ✅ Oui                                   | ✅ Fichier supprimé via `--invert-paths`              |
| 4   | Supabase JWT `eyJhbGci...REDACTED...` (≈31 chars, prefix tronqué)   | `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` ligne 49 | `63fdb50`                                                                | ✅ Oui (Service Role JWT régénéré)       | ✅ Fichier supprimé via `--invert-paths`              |
| 5   | Perplexity `pplx-lmtC...REDACTED...` (≈32 chars, prefix tronqué)    | `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` ligne 52 | `63fdb50`                                                                | ✅ Oui                                   | ✅ Fichier supprimé via `--invert-paths`              |
| 6   | ElevenLabs `sk_4702...REDACTED...` (≈32 chars, prefix tronqué)      | `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` ligne 55 | `63fdb50`                                                                | ✅ Oui                                   | ✅ Fichier supprimé via `--invert-paths`              |

**Note sur l'exposition réelle** : les 5 valeurs présentes dans `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` étaient déjà partiellement tronquées par l'auteur (suffixe littéral `...` après ≈30-50 chars). Elles ne pouvaient pas être authentifiées telles quelles auprès des fournisseurs, mais leurs préfixes restent identifiants. Le seul secret intégralement exposé en clair sur la durée était la clé OpenAI complète dans `.gitignore` ligne 101 (#1) — exposée environ **13 mois** (2025-04-27 → 2026-05-15). La rotation 5/5 reste la seule mesure de neutralisation effective.

---

## 3. Actions effectuées

### 3.1 Phase 0 — Précondition humaine

- Présentation explicite de la condition de rotation.
- 5/5 confirmations reçues du porteur (OpenAI, Anthropic, Supabase, Perplexity, ElevenLabs) avant tout passage Phase 1+.

### 3.2 Phase 1 — Vérification initiale

- `Makk7709/P.R.I.S.M` ✓
- `main` ✓
- HEAD = `origin/main` = `4a05a4f` ✓
- Working tree contenait le diff `PRISM_03` non commité (2301 staged deletions + `.gitignore` modifié + 4 untracked).

### 3.3 Phase 2 — Sauvegarde `PRISM_03` hors Git

- Dossier `/tmp/prism_03_hygiene_backup/` créé avec permissions `700`.
- 7 fichiers sauvegardés :
  - `PRISM_03_index.patch` (27,7 MB — 2301 deletions)
  - `PRISM_03_status_before_purge.txt`
  - `PRISM_03_new_gitignore.txt` (substitut sain au patch contaminé)
  - `PRISM_03_SECRET_AND_ENV_REGISTER.md`
  - `PRISM_03_REPO_HYGIENE_CLEANUP_REPORT.md`
  - `.env.example`
  - `.npmrc`
- Le patch `PRISM_03_working_tree.patch` (contenant la suppression de la clé `sk-proj-...` dans `.gitignore`) a été **supprimé immédiatement** après détection ; remplacé par `PRISM_03_new_gitignore.txt` (copie sanitaire du fichier final).
- Scan final du backup : **0 ligne avec pattern secret complet** sur les 7 fichiers.

### 3.4 Phase 3 — Working tree propre

- `git reset --hard HEAD` → tree restauré à `4a05a4f`.
- `git clean -fd` → suppression de `.env.example`, `.npmrc`, 2 reports `PRISM_03`, 8 `test-audit-temp-*`, `test-trustcontext-temp/`.
- `git status` : clean.

### 3.5 Phase 4 — Inventaire historique

- `SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md` : présent dans **96 commits** (à partir de `63fdb50`).
- `.gitignore` : pattern `sk-proj-...REDACTED...` présent dans **203 commits** sur 254 (introduit par `f3d15a3` 2025-04-27).
- Aucun autre fichier tracké à HEAD ne contient les préfixes secrets (vérifié par `git log -S` et par scan de `git ls-files`).

### 3.6 Phase 5 — Disponibilité `git-filter-repo`

- Binaire trouvé à `/opt/homebrew/bin/git-filter-repo` (version `a40bce548d2c`).
- Note: `git filter-repo --help` échoue car git cherche une man page absente ; le binaire est fonctionnel.

### 3.7 Phase 6 — Construction du fichier de remplacement

- `.git/info/secret-replacements.txt` créé, permissions `600`.
- 4 lignes uniques au format `literal:<VALUE>==>REMOVED_SECRET` (post `sort -u`) :
  - 2 × `sk-proj-...` (full key from `.gitignore` + prefix from SESSION_AUDIT)
  - 1 × `sk-ant-api0-...`
  - 1 × `pplx-...`
- Patterns `eyJhbGci...` et `sk_<hex>...` non capturés car les valeurs SESSION_AUDIT correspondantes étaient trop courtes (≤40 chars) pour matcher les regex minimum. Sans conséquence : ce fichier est entièrement supprimé via `--invert-paths` (Pass 1).
- **Fichier jamais affiché en terminal ni dans aucun fichier tracké.**

### 3.8 Phase 7 — Purge `git filter-repo` (2 passes)

**Pass 1** — suppression du fichier contaminé :

```bash
git filter-repo --path SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md --invert-paths --force
```

- Sortie : `Parsed 254 commits`, `New history written in 0.07 seconds`.
- `origin` retiré automatiquement par filter-repo (mesure de sécurité).
- HEAD intermédiaire : `c5fda34`.

**Pass 2** — remplacement des secrets restants (.gitignore line 101) :

```bash
git filter-repo --replace-text .git/info/secret-replacements.txt --force
```

- Sortie : `Parsed 254 commits` (la pré-purge a déjà supprimé certains commits, mais le scan reste sur la chaîne complète).
- HEAD final : `c5fd9ed3f56e319d55a5fe9321dcc0fb0bf85406`.

### 3.9 Restauration de `origin`

```bash
git remote add origin https://github.com/Makk7709/P.R.I.S.M.git
git fetch origin main
```

- `origin/main` (remote-tracking) = `4a05a4f` (état serveur, inchangé jusqu'au force-push).
- `refs/heads/main` (local) = `c5fd9ed` (chain purgée).

---

## 4. Vérifications post-purge

### 4.1 `git log --all -- SESSION_AUDIT_API_KEYS_02_SEPTEMBRE_2025.md`

- Sur `refs/heads/main` uniquement (la seule branche pertinente pour le push) : **0 commit** contient le fichier (253 commits scannés).
- Sur `--all` (toutes refs) : 95 commits référencent encore le fichier — uniquement via `refs/remotes/origin/main` (état distant pré-purge re-fetché). Ces objets seront purgés du repo local après force-push + `git gc`.
- Branches locales secondaires (`chore/gitignore-test-temp-dirs`, `migration/gpt-4.1`) : ✅ également réécrites par filter-repo, ne contiennent plus le fichier.
- 17 tags : ✅ tous réécrits, aucun ne contient le fichier.

### 4.2 Scan patterns secrets sur `refs/heads/main`

```
git rev-list --objects refs/heads/main | git cat-file --batch \
  | grep -aoE 'sk-proj-...|sk-ant-api0-...|pplx-...|eyJhbGci...|sk_...' | sort -u | wc -l
```

- **Résultat : 0 occurrence** — aucun pattern de secret réel ne subsiste dans aucun blob accessible depuis `refs/heads/main`.

### 4.3 Smoke test : `.gitignore` working tree

- Ligne 101 : `OPENAI_API_KEY=REMOVED_SECRET` ✓
- Ligne 102 : `OPENAI_MODEL=gpt-4-turbo` (non-sensible, conservée)
- Total lignes : 342 (343 − 1 légère normalisation par filter-repo).

### 4.4 `git status`

- Working tree clean post-purge.
- Aucun fichier non tracké hormis ce rapport en cours de rédaction.

### 4.5 Commits préservés

- Tous les messages de commit (titres, dates, auteurs) ont été préservés. Seuls les SHA changent.
- Topologie de la chaîne identique (sauf le commit `63fdb50` 2025-09-02 devenu vide après suppression du seul fichier qu'il introduisait, donc supprimé par filter-repo).
- HEAD message inchangé : « docs(valuation): align PRISM TRL claims with audit findings ».

---

## 5. Risques résiduels

| #   | Risque                                                                                                                                                                              | Mitigation                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Forks GitHub existants** peuvent toujours contenir l'historique pré-purge avec les secrets tronqués + la clé OpenAI complète                                                      | Les 5 clés ont déjà été rotées : exploitation impossible. Recommandation : auditer la liste des forks publics et demander GitHub Support pour invalider les caches si critique. |
| R2  | **GitHub Secret Scanning historique** peut avoir indexé la clé OpenAI sur 13 mois                                                                                                   | Clé révoquée : la détection n'a plus de valeur opérationnelle. GitHub purge automatiquement les alertes après rotation.                                                         |
| R3  | **Scrapers IA / archives Wayback** peuvent avoir collecté l'historique                                                                                                              | Clé révoquée : sans impact opérationnel. Aucune action humaine ou automatisee possible sur ces caches externes.                                                                      |
| R4  | **Clones locaux existants** chez d'autres contributeurs continueront à voir l'ancienne chaîne tant qu'ils n'auront pas reset hard                                                   | Cf. §6 — instructions post-force-push.                                                                                                                                          |
| R5  | **Repos satellites** (`prism-lite-DICA-ui-ux-design`) contiennent toujours leurs propres fuites (OpenAI / ElevenLabs documentées dans `PRISM_01`)                                   | **Hors périmètre `PRISM_04`.** Mission dédiée `PRISM_04B_SATELLITE_PURGE` requise.                                                                                              |
| R6  | **Dashboards fournisseurs** : il est recommandé de surveiller les logs d'API pour les 30 prochains jours afin de détecter toute tentative d'usage de l'ancienne clé OpenAI complète | Action humaine côté plateforme OpenAI / Anthropic / Supabase.                                                                                                                   |
| R7  | **Réintroduction accidentelle** lors de la réapplication du diff `PRISM_03`                                                                                                         | Le patch backup a été pré-scanné et sanitisé ; aucune valeur secrète n'y subsiste. Mais une vérification additionnelle est requise dans `PRISM_03B`.                            |

---

## 6. Instructions post-force-push (à diffuser aux contributeurs)

Une fois le force-push effectué, **tous les clones existants seront désynchronisés**. Chaque collaborateur doit exécuter :

```bash
# Option A — recommandée : reset hard sur la nouvelle main
git fetch origin
git reset --hard origin/main
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option B — drastique : reclone
cd ..
rm -rf P.R.I.S.M-old
mv P.R.I.S.M P.R.I.S.M-old   # sauvegarde des fichiers locaux uniquement
git clone https://github.com/Makk7709/P.R.I.S.M.git
```

**Important** :

- Ne **jamais merger** une ancienne branche contaminée (e.g. branches d'avant `c5fd9ed`) dans la nouvelle `main` — cela réintroduirait l'historique pollué.
- Supprimer toutes les branches locales orphelines : `git branch -D <old-branch>`.
- Supprimer les PR ouvertes basées sur l'ancienne main et les recréer.
- Notifier les forks : ils doivent eux-mêmes purger ou recloner ; sinon leur fork divergera et restera contaminé.

---

## 7. Prochaine mission recommandée

**`PRISM_03B_REAPPLY_HYGIENE_AFTER_SECRET_PURGE`** — réappliquer le diff `PRISM_03` (durcissement `.gitignore`, retrait du tracking de 2301 artefacts, création de `.env.example` + `.npmrc`, rapport `PRISM_03_SECRET_AND_ENV_REGISTER` + `PRISM_03_REPO_HYGIENE_CLEANUP_REPORT`) sur la nouvelle chaîne post-purge.

Le backup `/tmp/prism_03_hygiene_backup/` reste disponible (`.env.example`, `.npmrc`, 2 reports `PRISM_03`, `PRISM_03_new_gitignore.txt`, `PRISM_03_index.patch`, `PRISM_03_status_before_purge.txt`).

Missions secondaires (rappel `PRISM_03` §7-8) :

- `PRISM_04B_SATELLITE_PURGE` (repo `prism-lite-DICA-ui-ux-design` — cf. `PRISM_01`).
- `PRISM_04C_TYPECHECK_AND_TEST_STABILIZATION` (511 erreurs TS, hook non-bloquant).
- `PRISM_04D_STAGING_TRUE_REPRODUCIBILITY` (lazy-init OpenAI / F12).
- `PRISM_04E_DEPENDENCY_REPRODUCIBILITY_FIX` (retrait `legacy-peer-deps`, `npm audit` 29 vulnérabilités).
- `PRISM_04F_IDENTITY_AND_IP_FORMALIZATION` (brevet FR2507056, AGPL, cession de droits).

---

## 8. Annexes

### 8.1 Fichiers temporaires sensibles à supprimer en fin de mission

- `.git/info/secret-replacements.txt` (contient les valeurs littérales des secrets, jamais commité, jamais affiché). À supprimer après vérification post-purge confirmée.

### 8.2 Tags réécrits

`v0.1.0-quality-baseline`, `v0.2.0-trl5-proof-pack`, `v1.0.0`, `v1.0.0-final`, `v1.1.1`, `v2.0.1`, `v2.1-rc1`, `v2.3.0-final`, `v2.3.0-stress-system`, `v2.3.1`, `v2.4.0`, `v2.4.0-tdd-prismcore`, `v2.4.1-tdd-enterprise-api`, `v3.0.0` (et 3 autres). Tous pointent désormais sur les commits équivalents post-purge. Aucun ne contient le fichier contaminé. Le force-push devra inclure `--tags` si l'on veut propager les nouveaux SHAs des tags ; à défaut, les tags distants resteront sur les anciens SHAs (et ne contiendront que les objets équivalents dans la mesure où les blobs sont identiques côté serveur — ils restent désynchronisés tant qu'on ne pousse pas les tags).

**Décision pour Phase 11** : la mission prescrit « ne pas pousser de tags ». Cela signifie qu'après force-push de `main`, les tags GitHub continueront à pointer sur les anciens SHAs (qui n'existent plus localement). Les tags GitHub seront « zombies » — accessibles via leur SHA en URL mais détachés du graphe vivant. Recommandation alternative à valider humainement : forcer aussi `git push --force-with-lease --tags` pour réaligner. À traiter dans une mission de suivi si nécessaire.

---

**Fin du rapport `PRISM_04_SECRET_PURGE_HISTORY_AND_ROTATION`.**
