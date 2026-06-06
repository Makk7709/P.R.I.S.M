# PRISM — Audit hostile du rapport SonarQube

Objet: contester le rapport et le plan de remédiation. Posture adverse et
honnête. Question centrale: **que vaut réellement ce rapport, et corriger
améliore-t-il le produit ou ne fait-il que verdir un tableau de bord ?**

---

## 1. Ce que le rapport dit de PRISM — et ce qu'il ne dit pas

Distribution réelle (2930 issues localisées):

- **0 vulnérabilité de sécurité. 0 bug fonctionnel.** 2918/2930 = 99,6 % de
  MAINTAINABILITY, 2 RELIABILITY, 0 SECURITY.
- 71 % des issues sont MINOR (2088) ou INFO (11).
- Effort Sonar: 266 h, dont **158 h (59 %) sur du code Tier 3** (mort/legacy).

Lecture hostile n°1: **le rapport mesure du style, pas de la solidité.** Un score
de maintenabilité dégradé sur un prototype riche en modules expérimentaux est
attendu, et il ne dit rien sur la justesse fonctionnelle, la sécurité réelle, la
résilience, ou la dette d'architecture. Tout « verdir » sans esprit critique
serait une optimisation de vanity metric.

Ce que Sonar **ne voit pas** et qui est plus grave pour PRISM:

- **Surface de code morte massive.** ~63 % des issues sont sur du code non
  atteignable depuis `server.js` (root `prismCore.js`, `asi/`, `evolution/`,
  `memory/`, dizaines de `prism*.js` racine, démos `ui/*.html`). Le vrai
  problème n'est pas leur style: c'est qu'ils existent encore dans le dépôt et
  brouillent la lecture du périmètre productif. Sonar les compte; il ne dit pas
  « supprimez-les ».
- **Fragilité des tests core.** Les 76 tests core prennent ~65 s, dont un test
  property `consensus` à 64 s, et un test `trustContext.properties` flaky connu
  (corruption JSON sous concurrence). C'est un risque CI réel; Sonar n'en parle
  pas.
- **~511 erreurs TypeScript préexistantes** (`tsc --noEmit`), non bloquantes
  mais signe d'un typage en partie décoratif. Plus structurant que 2088 MINOR.
- **Cohérence du graphe de dépendances**: la fermeture production ne fait que 58
  fichiers, alors que le dépôt compte des centaines de fichiers `.js` racine.
  Le ratio code-actif / code-présent est le vrai signal de dette.

---

## 2. Faux positifs et règles cosmétiques

### 2.1 Faux positif net: S3516 (les 10 BLOCKER)

Les seuls BLOCKER du rapport (10) sont tous `S3516` « fonction retourne toujours
la même valeur ». 7 sont dans des **fichiers de test core** (générateurs/mocks
de `__tests__/properties/*.test.ts`, `__tests__/fuzz/*.test.ts`): un mock qui
retourne toujours `true`, un générateur fast-check constant — **c'est leur rôle**.
1 autre dans `__mocks__/prismStorage.js`. Les « corriger » casserait des tests
verts pour satisfaire une règle inadaptée au contexte de test. **Décision: ne
pas corriger; exclure le périmètre test de cette règle / NOSONAR justifié.**
Conséquence: la sévérité « BLOCKER » du rapport est trompeuse — il n'y a aucun
blocage réel en production.

### 2.2 Règles purement cosmétiques (vrai bruit)

- **S7748** (zéros décimaux `1.0`→`1`): zéro impact runtime. Auto-fixable sans
  risque, mais aucune valeur intrinsèque.
- **S7772** (`node:` protocol): bonne pratique moderne, effet nul à l'exécution
  sous Node 18. Cosmétique mais cheap à corriger.
- **S7781** (`replace`→`replaceAll`): **piège**. Sur `.replace('x', y)` (string,
  sans `/g`), remplacer par `replaceAll` **change le comportement** (premier vs
  tous). Un codemod aveugle introduirait des bugs. À ne mécaniser que sur
  `/regex/g`.
- **S125** (code commenté): souvent du vrai bruit, mais parfois de la doc
  d'intention. Suppression à l'aveugle = perte d'information.

### 2.3 Règles à sémantique subtile (risque de régression si « corrigé » bêtement)

- **S6582** (optional chaining): `a && a.b` → `a?.b` change `falsy` en `nullish`.
  Si `a` peut valoir `0`/`''`/`false`, la réécriture **change la branche prise**.
  Non mécanisable en aveugle.
- **S1854/S1481** (affectations/variables mortes): supprimer une déclaration dont
  l'initialiseur a un effet de bord (appel de fonction) casse le comportement.
- **S2486** (exceptions avalées): la « correction » Sonar peut masquer une
  décision délibérée de fail-open/fail-closed. À traiter au cas par cas, pas en
  masse.

Conclusion: une part significative du backlog est soit cosmétique (valeur
faible), soit risquée à automatiser (valeur négative si bâclée). La discipline
« lot atomique + tests » n'est pas optionnelle.

---

## 3. Le piège du score: corriger Tier 3 est-il dette ou gaspillage ?

Argument pour corriger Tier 3: « c'est de la dette, le score doit être vert
partout ». Réfutation: ce code n'est **pas exécuté** (hors fermeture
`server.js`, déjà exclu de `vitest`/`eslint`). Le corriger:

1. ne réduit aucun risque de production (le code ne tourne pas);
2. génère des diffs massifs sur du code non testé — donc **risque sans filet**;
3. coûte 158 h pour verdir des fichiers candidats à la suppression.

**Tranche: gaspillage.** La bonne action sur Tier 3 n'est pas « corriger » mais
« décider »: supprimer (idéalement) ou exclure de l'analyse (pragmatique, retenu
ici). Exclure via `sonar-project.properties` est honnête à condition que le
champ d'exclusion soit **documenté et limité au hors-périmètre-production**, pas
utilisé pour cacher de la dette active. C'est le cas ici: l'exclusion suit la
fermeture d'imports, pas un choix arbitraire.

Contre-argument auto-administré: « exclure, c'est tricher le score ». Réponse:
le score n'est pas la cible; la qualité du code _maintenu_ l'est. Exclure du
code mort recentre la métrique sur ce qui compte. La vraie dette de Tier 3 est
sa **présence**, traçée ici comme recommandation de nettoyage séparée — pas
comme une remédiation Sonar.

---

## 4. Risque de régression des refactos manuelles

Les seules corrections à valeur réelle sont les CRITICAL structurels de Tier 1
(S3776 complexité cognitive, S7059 async-in-constructor). Or ce sont précisément
les plus risquées:

- S3776 impose d'extraire des sous-fonctions. Sans tests couvrant la fonction,
  un refactor « iso-comportement » est une affirmation non vérifiable.
- Couverture réelle: seuls `src/core/*` (ConsensusManager, TrustContext, etc.)
  sont exercés par les 76 tests core. `backend/services/enterpriseSanitizer.js`
  (51 issues, le pire fichier Tier 1) **n'est pas** dans les 76 tests core — un
  refactor y serait à l'aveugle.

**Décision défensive:** refactor manuel uniquement là où un test échouerait en
cas de régression (fichiers `src/core` couverts). Ailleurs, on s'en tient au
mécanique sûr et on documente le manuel comme « différé, nécessite tests
dédiés ». Mieux vaut une issue ouverte et honnête qu'un refactor non vérifié.

---

## 5. Limites de la mesure elle-même

- **Pas d'outil Sonar local.** Aucun `eslint-plugin-sonarjs`, pas de
  `sonar-scanner` confirmé. Le « delta » ne peut pas être re-mesuré par un
  re-scan identique. On mesure: (a) `npm run lint` base avant/après (couvre les
  règles ESLint de base, pas les S-xxxx), et (b) un comptage d'occurrences des
  motifs effectivement corrigés (proxy). Le delta Sonar exact nécessitera un
  re-scan côté serveur SonarQube — explicitement hors de portée de ce poste.
- **Corrélation Clean Code non fiable** (cf. plan §1): l'annexe est incohérente
  en cardinalité. On ne prétend pas à un mapping impact↔issue.
- **Le rapport est un instantané.** Les rebases récents (PRISM_05/06) signifient
  que des lignes ont bougé; certains `(line N)` peuvent être périmés.

---

## 6. Verdict

1. Le rapport est **honnête sur la maintenabilité, muet sur l'essentiel** (code
   mort, fragilité CI, typage, sécurité réelle non vérifiée par Sonar ici).
2. **Aucune urgence de production**: 0 sécurité, 0 bug, 0 BLOCKER réel.
3. La valeur de la remédiation est concentrée sur **473 issues Tier 1**, dont
   ~120 mécaniques sûres et ~36 CRITICAL structurels (dont une fraction
   seulement est refactorable sans risque faute de tests).
4. **Corriger Tier 3 (1849 issues) serait du gaspillage**; l'action correcte est
   l'exclusion documentée et, à terme, la suppression du code mort.
5. Risque principal de la démarche: introduire des régressions en
   « sur-corrigeant ». Mitigation: lots atomiques, tests à chaque lot, refactor
   manuel limité au code couvert.

Recommandation finale: livrer le mécanique sûr Tier 1/2 + la réconciliation des
exports + un sous-ensemble de CRITICAL Tier 1 vérifiables par tests, exclure
Tier 3, et documenter le reste comme dette consciente plutôt que de le verdir
sans filet.
