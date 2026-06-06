import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

// `globals@11` ships a browser key with trailing whitespace
// (`'AudioWorkletGlobalScope '`) which ESLint 9 rejects. Trim keys defensively
// so we can consume the canonical set without upgrading the dependency.
const sanitizeGlobals = (set) =>
  Object.fromEntries(Object.entries(set).map(([k, v]) => [k.trim(), v]));
const browserGlobals = sanitizeGlobals(globals.browser);

// PRISM in-house ambient globals. These are not standard JS/Web/Node globals
// but PRISM singletons/classes that several modules reference without an
// `import` (the historical browser <script> pattern: a module attaches e.g.
// `prismBus`/`PrismMood` to the global scope and siblings consume it). They are
// declared `readonly` so legitimate uses stop firing `no-undef` while a typo of
// a STANDARD global (window/document/...) would still be reported. Declaring
// only these PRISM-specific names — never `globals.browser` — on Node modules
// keeps real Node `no-undef` dette visible.
const prismAmbientGlobals = {
  prismBus: 'readonly',
  PrismBus: 'readonly',
  PrismEvents: 'readonly',
  prismGhost: 'readonly',
  prismNotify: 'readonly',
  PrismMood: 'readonly',
  PrismVision: 'readonly',
  PrismEnergy: 'readonly',
  PrismChronicle: 'readonly',
  PrismEthos: 'readonly',
  PrismLegacyCore: 'readonly',
  PrismSentinel: 'readonly',
};

// Files that run in (or are written against) a browser/DOM context and
// legitimately use Web platform globals (window, document, localStorage,
// navigator, CustomEvent, requestAnimationFrame, Audio, crypto, ...). The root
// list is EXPLICIT (never a `prism*.js` glob) because the repository root also
// contains pure Node modules (prismCore.js, prismBus.js, prismVitals.js, ...);
// applying browser globals to them would mask real Node `no-undef`. `ui/**` and
// `src/voice/**` are entire browser/voice trees and are matched by glob.
const browserContextFiles = [
  // --- root UI / DOM / voice runtime modules ---
  'audio.js',
  'particles.js',
  'prismAPI.js',
  'prismAudit.js',
  'prismAwakening.js',
  'prismAwakeningRitual.js',
  'prismAwareness.js',
  'prismCheck.js',
  'prismChronicle.js',
  'prismCodexAnalyzer.js',
  'prismForecast.js',
  'prismFusion.js',
  'prismHarmony.js',
  'prismHeartbeat.js',
  'prismHyperConsciousness.js',
  'prismInit.js',
  'prismLegacy.js',
  'prismLegacyCore.js',
  'prismLoading.js',
  'prismMemory.js',
  'prismMeta.js',
  'prismNotify.js',
  'prismObserver.js',
  'prismPerf.js',
  'prismPersistence.js',
  'prismReflex.js',
  'prismSession.js',
  'prismSleep.js',
  'prismSovereignty.js',
  'prismStorage.js',
  'prismThink.js',
  'prismTone.js',
  'prismUI.js',
  'prismUpdate.js',
  'prismValidator.js',
  'prismVision.js',
  'prismVitals-original-buggy.js',
  'prismWitness.js',
  'test-voice-interruption-fix.cjs',
  // --- browser modules living under subdirectories ---
  'core/KernelBus.js',
  'core/Resilience.js',
  'memory/prismAdaptiveSeeds.js',
  'memory/prismCodex.js',
  'monitoring/prismBehaviorMap.js',
  'monitoring/prismLogger.js',
  'monitoring/prismSentientPulse.js',
  'monitoring/prismSovereignCycle.js',
  'regulation/prismElysiumMode.js',
  'src/voice/**',
  // --- entire browser UI tree + jsdom harnesses / mocks ---
  'ui/**',
  'tests/voice/setup.js',
  'jest.setup.jsdom.js',
  '__mocks__/insightCenter.js',
];

// Node modules that consume PRISM ambient globals (prismBus, PrismEvents, ...)
// but NO browser DOM globals. They get ONLY the PRISM names — keeping standard
// Node `no-undef` enforcement intact.
const prismAmbientNodeFiles = [
  'memory/prismCodexAnalyzer.js',
  'monitoring/prismAuroraConsciousness.js',
  'monitoring/prismBehavioralLearner.js',
  'monitoring/prismPostStressAnalyzer.js',
  'monitoring/prismReflection.js',
  'monitoring/prismSystemMonitor.js',
  'prismCleanup.js',
  'prismGuardian.js',
  'prismRetry.js',
  'prismStrategicLayer.js',
  'regulation/prismAdaptiveCycler.js',
  'regulation/prismStrategicLayer.js',
];

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Standard Node globals (timers, Buffer, process, URL, TextEncoder...).
        ...globals.node,
        // Modern Web/Node-18 globals not covered by the older `globals.node`
        // set but available under Node 18 (used across PRISM).
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        Blob: 'readonly',
        FormData: 'readonly',
        structuredClone: 'readonly',
        performance: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Console allowed for PRISM logging
      'no-undef': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-throw-literal': 'error',
      'no-useless-return': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
    },
  },
  {
    // Test runner globals (vitest/jest) — provided at runtime by `globals: true`.
    files: [
      '**/*.{test,spec}.{js,ts,mjs,cjs}',
      '**/__tests__/**',
      '**/tests/**',
      '**/simulation/**',
      '**/staging/**',
      // Jest bootstrap files and manual mocks reference jest/afterEach globals.
      'jest.setup.*.js',
      '__mocks__/**',
    ],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        suite: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    // Browser-context files (UI, voice, DOM runtime, jsdom harnesses). They
    // legitimately use the full Web platform surface, so we declare the
    // canonical `globals.browser` set rather than hand-maintaining individual
    // names. PRISM ambient globals are added too because many UI modules also
    // consume the in-house singletons. This is a CONFIG change only — no runtime
    // behaviour is altered. Scope is the explicit/glob allowlist above so Node
    // modules never receive browser globals.
    files: browserContextFiles,
    languageOptions: {
      globals: {
        ...browserGlobals,
        ...prismAmbientGlobals,
      },
    },
  },
  {
    // Node modules that reference PRISM ambient globals only (no DOM). Declaring
    // just the PRISM names keeps standard Node `no-undef` enforcement intact.
    files: prismAmbientNodeFiles,
    languageOptions: {
      globals: {
        ...prismAmbientGlobals,
      },
    },
  },
  {
    // JS/MJS/CJS: enable auto-removable unused-import cleanup (Sonar S1128) and
    // defer unused-variable reporting to the same plugin, keeping `^_` as the
    // "intentionally unused" convention. CONFIG-only and behaviour-preserving:
    // `unused-imports/no-unused-imports` only strips genuinely-unused imports on
    // --fix; remaining dead variables stay warnings (handled manually).
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // TypeScript files. We register the typescript-eslint parser so `.ts`
    // stops failing with "Parsing error: Unexpected token". This is a
    // SYNTACTIC setup only: we deliberately do NOT enable type-aware linting
    // (`projectService`/`project`) to avoid surfacing the ~511 pre-existing
    // `tsc` type errors and to keep linting fast. Mechanical `--fix` rules
    // (prefer-const, node: protocol, etc.) work without type information.
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // The core `no-undef` rule misfires on TypeScript type references and
      // ambient globals; the compiler already enforces this. Disable it for
      // `.ts` to avoid drowning real findings in false positives.
      'no-undef': 'off',
      // Defer unused-variable reporting to the TS-aware rule, which understands
      // type-only usage, enums and interfaces (the core rule misfires on them).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Auto-removable on --fix; addresses Sonar S1128 (unused imports). Only
      // genuinely-unused imports are removed (scope analysis, type-aware of
      // TS usage), so this is behaviour-preserving.
      'unused-imports/no-unused-imports': 'warn',
    },
  },
  prettier, // Must be last to override other configs
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      // Python virtualenvs are not part of the JS/TS source. They are
      // gitignored already; linting their bundled JS (e.g. urllib3's
      // emscripten_fetch_worker.js) only produces third-party noise.
      '**/.venv/**',
      '**/venv/**',
      '**/__pycache__/**',
      // Generated build artifacts — NEVER lint generated code (e.g. the
      // Next.js compiler output under dashboard/.next). Linting it produces
      // thousands of meaningless errors against minified/transpiled output.
      '**/.next/**',
      '.prism-snapshots/**',
      '**/*.min.js',
      // Vendored third-party library: utils/lz-string.js is the canonical
      // pieroxy/lz-string algorithm copied verbatim (only a French JSDoc
      // header was added). Its `==`/var style is inherent to the upstream
      // source, not PRISM code we own, so it is out of lint scope.
      'utils/lz-string.js',
      '**/legacy_tests/**',
      '__tests_legacy__/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
];
