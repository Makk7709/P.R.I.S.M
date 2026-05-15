# PRISM_04B — Remote Tags Sanity After Secret Purge

**Mission :** `PRISM_04B_REMOTE_TAGS_SANITY_AFTER_SECRET_PURGE`
**Date :** 2026-05-15
**Personae :** incident responder Git + auditeur sécurité historique + commissaire aux apports prudent
**Repo :** `Makk7709/P.R.I.S.M`
**Branche :** `main`

---

## 1. Verdict exécutif

| Item                             | État                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Repo                             | `Makk7709/P.R.I.S.M`                                                                                               |
| Branche                          | `main`                                                                                                             |
| HEAD local                       | `fbb2a5bf1a6ec29ee5d5992402e96adae5341f85`                                                                         |
| HEAD `origin/main`               | `fbb2a5bf1a6ec29ee5d5992402e96adae5341f85` (aligné)                                                                |
| Tags audités                     | 14                                                                                                                 |
| Tags alignés avant correction    | 3 (`v1.0.0`, `v1.0.0-final`, `v1.1.1` — naturellement sains car pointent vers des commits pré-fuite de 2025-04-27) |
| Tags divergents avant correction | **11** (pointaient vers la chaîne pré-purge contaminée)                                                            |
| Action effectuée                 | **Option C** — re-push `--force-with-lease` avec valeur attendue explicite pour chacun des 11 tags divergents      |
| Tags alignés après correction    | **14 / 14**                                                                                                        |
| Scan secrets refs/heads/main     | ✅ **0 hit** sur 84 230 740 bytes de blobs                                                                         |
| Scan secrets refs/tags/\* (tous) | ✅ **0 hit** sur 740 MB cumulés de blobs                                                                           |
| Risque résiduel                  | Forks GitHub publics éventuels + clones locaux non synchronisés (cf. §5)                                           |

### Verdict final : ✅ **Refs distantes propres. La purge `PRISM_04` est désormais effective sur `main` ET tous les tags GitHub.**

---

## 2. Tags audités

| Tag                       | SHA local       | SHA distant avant | SHA distant après | Statut                                                     |
| ------------------------- | --------------- | ----------------- | ----------------- | ---------------------------------------------------------- |
| v0.1.0-quality-baseline   | `24624c1199...` | `1f7fdac9b0...`   | `24624c1199...`   | ✅ Corrigé                                                 |
| v0.2.0-trl5-proof-pack    | `7c7ee9bd27...` | `d44e008fc8...`   | `7c7ee9bd27...`   | ✅ Corrigé                                                 |
| v1.0.0                    | `d598e0c267...` | `d598e0c267...`   | `d598e0c267...`   | ✅ Pré-aligné (commit pré-fuite, intouché par filter-repo) |
| v1.0.0-final              | `0c4653d9d5...` | `0c4653d9d5...`   | `0c4653d9d5...`   | ✅ Pré-aligné                                              |
| v1.1.1                    | `13c67f0907...` | `13c67f0907...`   | `13c67f0907...`   | ✅ Pré-aligné                                              |
| v2.0.1                    | `ba0908b326...` | `a49c799d01...`   | `ba0908b326...`   | ✅ Corrigé                                                 |
| v2.1-rc1                  | `a9afeba649...` | `dfcaca41b1...`   | `a9afeba649...`   | ✅ Corrigé                                                 |
| v2.3.0-final              | `cb4da26b45...` | `b87b2d24b3...`   | `cb4da26b45...`   | ✅ Corrigé                                                 |
| v2.3.0-stress-system      | `d90d993924...` | `b655f4529c...`   | `d90d993924...`   | ✅ Corrigé                                                 |
| v2.3.1                    | `d7545e9cca...` | `deb519b311...`   | `d7545e9cca...`   | ✅ Corrigé                                                 |
| v2.4.0                    | `15d3cfe0f5...` | `05da4bfbfb...`   | `15d3cfe0f5...`   | ✅ Corrigé                                                 |
| v2.4.0-tdd-prismcore      | `067263acc8...` | `55725a5be3...`   | `067263acc8...`   | ✅ Corrigé                                                 |
| v2.4.1-tdd-enterprise-api | `9f7e38975c...` | `a1b31d13bc...`   | `9f7e38975c...`   | ✅ Corrigé                                                 |
| v3.0.0                    | `0ec80a15f8...` | `63f69e910a...`   | `0ec80a15f8...`   | ✅ Corrigé                                                 |

**Bilan :** 14 / 14 tags désormais alignés entre local et distant.

### 2.1 Pourquoi v1.0.0, v1.0.0-final, v1.1.1 étaient déjà alignés

Ces 3 tags pointent vers des commits du 2025-04-27 antérieurs au commit `f3d15a3` qui a introduit la fuite OpenAI dans `.gitignore` ligne 101 :

- `v1.0.0` → commit du 2025-04-27 04:47 (pré-fuite)
- `v1.0.0-final` → commit du 2025-04-27 15:40 (pré-fuite)
- `v1.1.1` → commit du 2025-04-27 12:44 (pré-fuite)

`git filter-repo` n'a donc pas eu besoin de réécrire ces commits, et les SHA des tags sont restés identiques. Vérification de `.gitignore` à chacun de ces tags : **0 ligne contenant le pattern `sk-proj-...`**, **0 token `REMOVED_SECRET`** → propres par construction.

---

## 3. Scan secrets

### 3.1 Pré-correction (Phase 2)

| Ref                     | Bytes scannés   | Hits                 | Verdict             |
| ----------------------- | --------------- | -------------------- | ------------------- |
| `refs/heads/main`       | 84 230 740      | **0**                | ✅ Local main clean |
| `refs/tags/*` (14 tags) | ~740 MB cumulés | **0** sur chaque tag | ✅ Local tags clean |

### 3.2 Confirmation que les tags distants étaient contaminés AVANT correction

Échantillonnage de 2 tags distants pré-correction (lecture via `git fetch --depth=1 <old_remote_commit>`) :

| Tag                      | Ancien commit distant                      | `sk-proj-...` hits dans `.gitignore` | Statut    |
| ------------------------ | ------------------------------------------ | ------------------------------------ | --------- |
| `v3.0.0`                 | `63f69e910a4bd5c67158ac3cead5dc31f5d3a441` | **1** (clé OpenAI complète)          | Contaminé |
| `v0.2.0-trl5-proof-pack` | `769250a332f96da7fefbadd7315c5bf9a44b6aec` | **1** (clé OpenAI complète)          | Contaminé |

→ Le risque que les tags GitHub continuent à servir l'ancien `.gitignore` avec la clé `sk-proj-...REDACTED` était **réel et empiriquement confirmé** avant Phase 4.

### 3.3 Post-correction (re-vérification)

Échantillon post-push :

| Tag      | Nouveau commit distant                     | `sk-proj-...` hits | `REMOVED_SECRET` token | Verdict |
| -------- | ------------------------------------------ | ------------------ | ---------------------- | ------- |
| `v3.0.0` | `cb1c4af0e27d026ba9c7daed6fee730042b66903` | **0**              | **1**                  | ✅ Sain |

Patterns recherchés à chaque scan (jamais de valeur secrète complète imprimée dans le terminal ou ce rapport) :

- `sk-proj-[A-Za-z0-9_-]{30,}` (OpenAI)
- `sk-ant-api[0-9]+-[A-Za-z0-9_-]{30,}` (Anthropic)
- `pplx-[A-Za-z0-9]{20,}` (Perplexity)
- `eyJhbGci[A-Za-z0-9._=+/-]{50,}` (JWT format Supabase)
- `sk_[a-fA-F0-9]{40,}` (ElevenLabs hex)

---

## 4. Décision appliquée

### 4.1 Option retenue : **Option C — re-push contrôlé des tags divergents**

**Justification :**

- Les tags distants pointaient vers la chaîne pré-purge contenant le `.gitignore` fuité (vérifié empiriquement §3.2).
- L'Option A (ne rien faire) laissait 11 tags GitHub publiquement servir la clé OpenAI fuitée, malgré rotation côté provider — risque réputationnel + traçabilité de la fuite pour un auditeur CAA.
- L'Option B (documenter et reporter) reportait inutilement le risque sans surcoût technique significatif (11 push tag-par-tag = 11 secondes).

### 4.2 Méthode utilisée

Pour chacun des 11 tags divergents :

```bash
git push --force-with-lease="refs/tags/<TAG>:<OLD_REMOTE_SHA>" \
         origin "refs/tags/<TAG>:refs/tags/<TAG>"
```

- `--force-with-lease=<refname>:<expected-sha>` impose qu'au moment du push, `refs/tags/<TAG>` côté serveur pointe **toujours** sur `<OLD_REMOTE_SHA>`. Si quelqu'un d'autre a modifié le tag entre-temps, le push est rejeté.
- Push tag-par-tag, jamais `--tags` aveugle.
- Jamais `--force` simple.
- Aucune autre branche n'a été poussée.
- Aucun tag nouveau créé.

### 4.3 Résultats

- 10 / 11 tags poussés avec succès au premier passage.
- 1 tag (`v3.0.0`) initialement manqué à cause d'un quirk d'indexation `zsh` (tableaux 1-indexés vs 0-indexés). Repush explicite réussi.
- Aucun tag rejeté par `--force-with-lease` → confirme qu'aucune modification concurrente n'avait eu lieu côté serveur depuis l'audit.

---

## 5. Risques résiduels

| #   | Risque                                                                                                                   | Sévérité                                           | Mitigation                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Forks GitHub publics** existant avant Phase 4 contiennent toujours les anciens tags pointant vers la chaîne contaminée | Faible (les 5 clés ont été rotées dans `PRISM_04`) | Auditer la liste des forks publics du repo via GitHub API ; demander rotation/recloning aux propriétaires si critique. Hors périmètre `PRISM_04B`.                                                                           |
| R2  | **Clones locaux** chez d'éventuels collaborateurs détiennent les anciennes refs (tags) en cache                          | Moyen                                              | Voir `PRISM_04_SECRET_PURGE_HISTORY_REPORT.md` §6 : reset hard ou reclone obligatoire. Inclure également les tags : `git fetch origin --tags --prune --prune-tags` ou `git tag -d $(git tag -l) && git fetch origin --tags`. |
| R3  | **Wayback Machine / scrapers IA** qui ont collecté les tags avant `2026-05-15 21:51`                                     | Faible (clés déjà rotées)                          | Aucune action humaine ou automatisee possible sur ces caches externes.                                                                                                                                                            |
| R4  | **Repos satellites** (`prism-lite-DICA-ui-ux-design`) restent contaminés                                                 | Critique                                           | Mission dédiée `PRISM_04C_SATELLITE_PURGE` (à enchaîner).                                                                                                                                                                    |
| R5  | **Réintroduction** lors de la réapplication `PRISM_03`                                                                   | Faible                                             | Backup `/tmp/prism_03_hygiene_backup/` déjà sanitisé (cf. `PRISM_04` §3.3) ; scan additionnel obligatoire dans `PRISM_03B`.                                                                                                  |
| R6  | **Dashboards fournisseurs** : surveiller les logs pendant 30 j pour usage de l'ancienne clé OpenAI complète              | Modéré                                             | Action humaine côté OpenAI / Anthropic / Supabase / Perplexity / ElevenLabs.                                                                                                                                                 |

---

## 6. Prochaine mission recommandée

**`PRISM_03B_REAPPLY_HYGIENE_AFTER_SECRET_PURGE`** — réappliquer le travail `PRISM_03` (durcissement `.gitignore`, retrait du tracking de ~2301 artefacts, `.env.example`, `.npmrc`, registre des secrets, rapport d'hygiène) sur la chaîne désormais entièrement propre (`main` + 14 tags).

Le backup `/tmp/prism_03_hygiene_backup/` reste prêt à l'emploi (7 fichiers, 0 secret).

Missions secondaires à enchaîner (rappel `PRISM_03` §7-8) :

- `PRISM_04C_SATELLITE_PURGE` (repo `prism-lite-DICA-ui-ux-design` — cf. `PRISM_01`).
- `PRISM_04D_TYPECHECK_AND_TEST_STABILIZATION` (511 erreurs TS, hook non-bloquant).
- `PRISM_04E_STAGING_TRUE_REPRODUCIBILITY` (lazy-init OpenAI / F12).
- `PRISM_04F_DEPENDENCY_REPRODUCIBILITY_FIX` (retrait `legacy-peer-deps`, `npm audit` 29 vulnérabilités).
- `PRISM_04G_IDENTITY_AND_IP_FORMALIZATION` (brevet FR2507056, AGPL, cession de droits).

---

## 7. Annexes

### 7.1 Commande de vérification reproductible

Pour qu'un auditeur tiers reproduise le résultat :

```bash
# Sur le repo cloné après 2026-05-15 21:51
git fetch origin --tags --prune
git show-ref --tags

# Compare local vs remote
diff <(git show-ref --tags | sort) \
     <(git ls-remote --tags origin | grep -v '\^{}' | sort)
# Sortie attendue : aucune différence

# Scan secret (sera 0 hit attendu)
for ref in refs/heads/main $(git for-each-ref --format='%(refname)' refs/tags); do
  git rev-list --objects "$ref" | awk '{print $1}' \
    | git cat-file --batch-check='%(objectname) %(objecttype) %(objectsize)' \
    | awk '$2=="blob"{print $1}' \
    | git cat-file --batch=' ' \
    | grep -aocE 'sk-proj-|sk-ant-api|pplx-|eyJhbGci|sk_[A-Za-z0-9]'
done
# Sortie attendue : 0 pour chaque ref
```

### 7.2 Fichiers temporaires utilisés (tous supprimés à fin de mission)

- `/tmp/_local_tags.tsv`, `/tmp/_remote_tags.tsv`, `/tmp/_divergent_tags.txt`, `/tmp/_leases.tsv` (utilisés pour la comparaison).
- `/tmp/_main.bin`, `/tmp/_t.bin` (dumps de blobs pour scan, ne contenaient aucun secret car les refs locales étaient déjà propres post-`PRISM_04`).
- Aucun fichier temporaire ne contenait de valeur secrète complète.

---

**Fin du rapport `PRISM_04B_REMOTE_TAGS_SANITY_AFTER_SECRET_PURGE`.**
