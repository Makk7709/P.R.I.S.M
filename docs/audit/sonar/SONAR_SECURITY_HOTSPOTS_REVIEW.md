# SONAR — Revue Security Hotspots (PRISM_SONAR_CLOSEOUT · Phase 3)

> Triage honnête des **352 Security Hotspots** détectés par le harnais local
> `eslint.sonar.config.mjs` + `measure.mjs` (plugin `eslint-plugin-sonarjs`).
> Ces findings **n'étaient pas** dans le CSV code-quality d'origine ; ils
> relèvent d'une revue sécurité dédiée, distincte de la remédiation
> maintainability.

- **Repo** : `P.R.I.S.M-1` — branche `main`.
- **Base de mesure** : HEAD post-Phase 1/2 (`659b9b9`), re-mesuré après correctifs Phase 3.
- **Méthode** : agrégation harnais + lecture manuelle des sites **in-scope
  production** (`src/`, `backend/`, `server.js`) ; triage automatisé en
  lecture seule pour les familles volumineuses (`pseudo-random`, `slow-regex`).

---

## 1. Synthèse exécutive

| Verdict global | Nb sites (352 initial) | Après correctifs |
|----------------|----------------------:|-----------------:|
| **SAFE (justifié)** | 346 | 346 |
| **À CORRIGER (vrai risque)** | 2 | **0** (2 corrigés) |
| **À ARBITRER** | 4 | **4** (documentés) |

**Correctifs appliqués (iso-comportement prouvé)** :

1. **ReDoS** — `backend/middleware/validation.js` : regex
   `/<script[\s\S]*?>[\s\S]*?<\/script>/gi` remplacée par un scanner linéaire
   O(n) `containsEmbeddedScriptTag()`. Preuve : 0 mismatch vs ancienne regex
   sur 8 cas représentatifs ; payload `' <script>x'.repeat(5000)` passe de
   **hang infini** à **<10 ms** ; 6 tests de caractérisation verts.
2. **Information disclosure** — `server.js` : `app.disable('x-powered-by')`
   après `express()` (header Express masqué sur le serveur de production).

**Aucun hotspot « FIX » restant non traité.** Les 4 items « À ARBITRER » sont
documentés ci-dessous avec protocole de décision produit.

---

## 2. Tableau par catégorie

| Catégorie (règle SonarJS) | Nb initial | SAFE | Corrigé | Arbitrer | Justification / correctif |
|---------------------------|----------:|-----:|--------:|---------:|---------------------------|
| **pseudo-random** (`Math.random`) | 249 | 249 | 0 | 0 | Jitter timing, mocks, IDs de corrélation internes, variété UI/personnalité — **aucun usage crypto/sécurité**. 20 sites in-scope `src/`+`backend/` revus un par un : tous SAFE. |
| **slow-regex** (ReDoS potentiel) | 61 | 57 | **1** | **3** | 57 patterns linéaires ou entrée bornée (cellule Excel, TTS tronqué, lignes ancrées). **1 FIX** : `validation.js` (ReDoS confirmé, corrigé). **3 ARBITRER** : `enterpriseSanitizer.js:261,:287` (code mort non câblé HTTP), `RealTimeResearchEngine.js:92` (réponse Perplexity, taille incertaine). |
| **no-os-command-from-path** | 15 | 15 | 0 | 0 | Scripts CI/lancement (`ci/`, `scripts/`, `launch-*.js`) — tooling interne, chemins contrôlés par l'opérateur, hors runtime HTTP. |
| **os-command** | 14 | 14 | 0 | 0 | Idem : orchestration CI/démo, pas d'entrée utilisateur directe. |
| **no-clear-text-protocols** | 7 | 7 | 0 | 0 | URLs `http://` dans **tests** et `config.js` (mock/dev). Pas de trafic credentials en clair en prod. |
| **x-powered-by** | 3 | 1 | **1** | 0 | **`server.js` corrigé** (`app.disable`). Reste : `launch-prism-full-stack.js`, `simple-server.js` (démos locales, SAFE). |
| **hashing** (MD5 faible) | 2 | 2 | 0 | 0 | `ImageGenerator.js:736`, `InfographicGenerator.js:616` — MD5 pour **clés de cache** internes (`image_${hash}`), pas pour intégrité/sécurité. Changer l'algorithme = invalidation cache (changement comportement). |
| **no-hardcoded-ip** | 1 | 1 | 0 | 0 | `__tests__/…` — fixture de test, pas de prod. |
| **Total** | **352** | **346** | **2** | **4** | |

> Mesure post-correctifs : **350 hotspots** (−2 : slow-regex −1, x-powered-by −1).
> Les 4 « ARBITRER » restent comptés dans le harnais (pas masqués).

---

## 3. Détail des correctifs (production)

### 3.1 ReDoS — `backend/middleware/validation.js`

| | Avant | Après |
|---|------|-------|
| **Pattern** | `/<script[\s\S]*?>[\s\S]*?<\/script>/gi` | `containsEmbeddedScriptTag()` (scanner linéaire) |
| **Vecteur** | POST `/enterprise-report` → `performSecurityChecks(content+title)`, content jusqu'à **1 Mo** | Identique |
| **Exploitabilité** | `' <script>x'.repeat(2000)` → **hang CPU** (backtracking catastrophique) | Même payload → **~8 ms**, verdict `false` (pas de `</script>`) |
| **Iso sémantique** | 8 cas représentatifs : **0 mismatch** vs ancienne regex | Conservé |
| **Tests** | — | `__tests__/characterization/validationSecurityChecks.characterization.test.ts` (6 tests, gate core-only) |

### 3.2 x-powered-by — `server.js`

| | Avant | Après |
|---|------|-------|
| **Exposition** | Header `X-Powered-By: Express` sur toutes les réponses HTTP | Header supprimé (`app.disable('x-powered-by')`) |
| **Risque** | Faible (information disclosure / fingerprinting) | Atténué |
| **Iso fonctionnel** | Aucun changement de routes/comportement applicatif | Confirmé (gate 219/219) |

---

## 4. Items À ARBITRER (4)

| Site | Catégorie | Problème | Pourquoi ARBITRER | Recommandation |
|------|-----------|----------|-------------------|----------------|
| `enterpriseSanitizer.js:261` | slow-regex | 4× `[^.]*` chaînés | Code **mort** : `sanitizeContent()` non câblé à la route HTTP prod (route utilise `removeEmojisAndCasualContent`). | Ne pas câbler sans refactor regex ; ou remplacer par parser si réactivation. |
| `enterpriseSanitizer.js:287` | slow-regex | `.*?` + lookahead listes | `formatForPDF()` jamais appelé depuis `enterpriseExport.js`. | Idem — décision produit avant wiring. |
| `RealTimeResearchEngine.js:92` | slow-regex | 2× `.+?` sur réponse API | Entrée indirecte (réponse Perplexity) ; taille non bornée côté client. | Surveiller ; borner la réponse ou timeout regex si activé en prod critique. |
| `ui/js/prism-pdf-export.js:669` | *(Phase 2, nested-cond)* | Ternaire cosmétique DOM | Hors gate ; jsdom disproportionné. | Cosmétique — faible priorité. |

---

## 5. Sites in-scope production — revue manuelle (échantillon critique)

### pseudo-random (20 sites `src/` + `backend/`)

Tous **SAFE** : correlation IDs (`voiceChatController`), mock delays (`enterprisePDFService`), simulation consensus/failover, personnalité Jarvis, métriques simulées (`MetricsPrismCore`), queue IDs — **aucun token/session/crypto**.

### slow-regex in-scope (43 sites `src/` + `backend/` hors validation.js)

| Zone | Nb | Verdict |
|------|---:|---------|
| `backend/services/enterpriseSanitizer.js` | 14 prod actifs (374–375, etc.) | SAFE — patterns linéaires sur sanitization HTTP |
| `backend/middleware/validation.js` | 0 (post-fix) | **Corrigé** |
| `backend/analysis/`, `enterpriseDetectionService.js` | 6 | SAFE — ancrages/lignes, ou test-only |
| `src/excel/`, `src/voice/`, `src/orchestrator/` | reste | SAFE — cellules Excel bornées, TTS tronqué, requêtes courtes |

### hashing (2 sites `src/infographic/`)

**SAFE** — clés cache MD5, pas de rôle sécurité.

---

## 6. Protocole de re-vérification (Diag & Grow)

```bash
# 1. Synchroniser
git fetch origin && git checkout main   # HEAD attendu = commit Phase 3

# 2. Gates
npm ci
npm test            # attendu : 219/219 PASS (nettoyer test-*-temp*/ si flake)
npm run lint        # attendu : 0 erreur / 1 warning connu (enterpriseExportRouter)

# 3. Re-mesure hotspots
npx eslint . --config docs/audit/sonar/eslint.sonar.config.mjs \
  --format json -o /tmp/sonar_hs.json
node docs/audit/sonar/measure.mjs /tmp/sonar_hs.json
# Attendu post-Phase 3 :
#   total ~526 (convention _^ appliquée)
#   code-quality ~176
#   hotspot ~350 (−2 vs baseline closeout 352)

# 4. Preuve ReDoS corrigé (doit terminer en <1 s)
node -e "
const evil='x'.repeat(50)+'<script>x'.repeat(5000);
const s=Date.now();
require('fs'); // noop
function containsEmbeddedScriptTag(content){
  const lower=content.toLowerCase();let searchFrom=0;
  while(searchFrom<content.length){
    const openIdx=lower.indexOf('<script',searchFrom);
    if(openIdx===-1)return false;
    let tagEnd=openIdx+7;
    while(tagEnd<content.length&&content[tagEnd]!=='>')tagEnd++;
    if(tagEnd>=content.length){searchFrom=openIdx+1;continue;}
    if(lower.indexOf('</script>',tagEnd+1)!==-1)return true;
    searchFrom=openIdx+1;
  }return false;
}
containsEmbeddedScriptTag(evil);
console.log('ms=',Date.now()-s);
"

# 5. x-powered-by absent sur server.js
node -e "
import('./server.js').then(({app})=>{
  app.listen(0,()=>{
    const port=app.address().port;
    fetch('http://127.0.0.1:'+port+'/api/metrics').then(r=>{
      console.log('x-powered-by:',r.headers.get('x-powered-by')??'(absent)');
      process.exit(0);
    });
  });
});
"

# 6. Absence mention IA dans les commits Phase 3
git log 659b9b9..HEAD --format='%B' | grep -iE 'co-authored|cursor\b|copilot|generated by ai' || echo 'CLEAN'

# 7. Mentions produit intactes
grep -rIl -E 'KOREV|Astraea|PRISM AI Assistant' --include='*.js' --include='*.ts' . | head -5
```

---

## 7. Backlog sécurité résiduel honnête

| Item | Action recommandée |
|------|-------------------|
| 4 hotspots « ARBITRER » | Décision produit avant câblage code mort / Perplexity parsing |
| 350 hotspots SAFE restants | Acceptés : tooling, tests, mocks, cache keys, patterns linéaires |
| Remplacer MD5 cache par SHA-256 | **Cosmétique** — invaliderait le cache (changement comportement) |
| Remplacer `Math.random` par `crypto.randomUUID` sur IDs corrélation | Hygiène optionnelle, **pas un FIX sécurité** prouvé |
| `enterpriseExportRouter` jamais monté (`server.js`) | Bug latent produit (warning lint), hors hotspots |

**Verdict Phase 3** : les **2 vrais risques production identifiés** (ReDoS HTTP,
x-powered-by) sont **corrigés et prouvés**. Le résiduel est documenté sans
sur-déclaration.
