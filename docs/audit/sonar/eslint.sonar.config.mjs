// Measurement-only ESLint flat config: runs eslint-plugin-sonarjs (the SonarJS
// engine exposed via ESLint) to obtain a GROUND-TRUTH local count of the Sonar
// rules it implements. NOT wired into `npm run lint` (which keeps its own
// 0-error/1-warning gate). Used by docs/audit/sonar measurement scripts only.
//
// Note: the newer S77xx mechanical families (node: protocol, Number.parseX,
// decimal zeros, replaceAll, globalThis, ...) are NOT implemented in the OSS
// plugin and are handled separately via codemods. This config measures the
// structural/maintainability rules that ARE implemented.
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default [
  sonarjs.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1 — Entérinement des CONVENTIONS DE PROJET intentionnelles.
  // Chaque assouplissement ci-dessous ne supprime QUE des faux positifs dus à
  // une convention délibérée, vérifiée site par site (cf. SONAR_REMEDIATION_LOG
  // « Campagne PRISM_SONAR_CLOSEOUT »). AUCUN vrai défaut n'est masqué : les
  // findings non conformes à la convention restent signalés.
  // ─────────────────────────────────────────────────────────────────────────

  // (1) Convention « variable intentionnellement inutilisée » : préfixe `_`.
  //     120/134 findings `sonarjs/no-unused-vars` portent un binding `_`-préfixé
  //     (paramètres de signature, valeurs intermédiaires de lisibilité, erreurs
  //     catch volontairement ignorées) ; les 14 restants (tous __tests_legacy__/,
  //     Tier 3) ne le sont PAS et sont de vrais unused.
  //     IMPORTANT : la règle OSS `sonarjs/no-unused-vars` n'accepte AUCUNE
  //     option (schéma vide) → le pattern `^_` ne peut pas y être encodé ici
  //     (contrairement à SonarQube serveur où la convention s'exprime via
  //     `sonar.issue.ignore`). On laisse donc la règle ACTIVE et NON masquée
  //     (un `eslint` brut affiche bien les 134) ; la convention `^_` est
  //     appliquée de façon transparente et documentée au niveau de l'AGRÉGATION
  //     (`measure.mjs`, bucket `conventionSuppressed`), qui n'écarte QUE les
  //     bindings `^_`. Aucun vrai unused n'est masqué.

  // (2) Squelettes TDD : les specs `__tests__/core/prismcore/*.spec.ts`
  //     documentent des CONTRATS d'API non encore implémentés sous forme de
  //     blocs commentés (avec `expect(core).toBeUndefined()` + `// ÉCHEC
  //     ATTENDU`). S125 (`no-commented-code`) y est un faux positif : ce n'est
  //     pas du code mort de production mais de la documentation de test
  //     intentionnelle. Désactivation scopée au seul arbre de test.
  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/*.test.ts',
      '**/*.test.js',
    ],
    rules: {
      'sonarjs/no-commented-code': 'off',
    },
  },

  // (3) Alias de domaine nominaux : `simulation/` modélise des unités métier
  //     (NTU, µS/cm, °C, bar, mg/L) via `export type Unité = number`. SonarJS
  //     `redundant-type-aliases` (S6564) les juge « redondants » mais l'alias
  //     nominal porte une intention sémantique (lisibilité du domaine de
  //     traitement d'eau UF→RO). Désactivation scopée au seul dossier métier.
  {
    files: ['simulation/**/*.ts'],
    rules: {
      'sonarjs/redundant-type-aliases': 'off',
    },
  },

  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/.venv/**',
      '**/venv/**',
      '**/__pycache__/**',
      '**/.next/**',
      '.prism-snapshots/**',
      '**/*.min.js',
      'utils/lz-string.js',
      'dashboard/**',
      // measurement noise: generated/vendored
    ],
  },
];
