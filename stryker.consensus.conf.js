/**
 * STRYKER CONFIGURATION - CONSENSUS MANAGER
 * 
 * Configuration pour les tests de mutation du ConsensusManager
 */

export default {
  // Répertoire de travail
  tempDirName: '.stryker-tmp',
  
  // Type de projet
  projectType: 'node',
  
  // Répertoires à inclure/exclure
  mutate: [
    'src/consensus/**/*.ts'
  ],
  
  // Fichiers de test
  testRunner: 'vitest',
  testRunnerNodeArgs: ['--config', 'vitest.config.consensus.ts'],
  
  // Répertoires à ignorer
  ignorePatterns: [
    'node_modules/**',
    'coverage/**',
    'reports/**',
    'tests/**/*.spec.ts',
    'tests/**/*.test.ts'
  ],
  
  // Seuils de qualité
  thresholds: {
    high: 80,
    low: 60,
    break: 60
  },
  
  // Rapport
  reporters: [
    'html',
    'clear-text',
    'progress',
    'json'
  ],
  
  // Configuration des rapports
  htmlReporter: {
    baseDir: 'reports/mutation'
  },
  
  jsonReporter: {
    fileName: 'reports/mutation/stryker-report.json'
  },
  
  // Configuration des mutateurs
  mutator: {
    name: 'typescript',
    excludedMutations: [
      'StringLiteral',
      'ArrayDeclaration'
    ]
  },
  
  // Configuration des plugins
  plugins: [
    '@stryker-mutator/vitest-runner'
  ],
  
  // Configuration du runner
  vitest: {
    configFile: 'vitest.config.consensus.ts'
  },
  
  // Timeout
  timeoutMS: 60000,
  dryRunTimeoutMS: 60000,
  
  // Configuration de la concurrence
  concurrency: 2,
  
  // Configuration des fichiers
  files: [
    'src/**/*.ts',
    'tests/**/*.ts'
  ],
  
  // Configuration des dépendances
  dependencies: {
    // Dépendances externes à ignorer
    ignore: [
      'vitest',
      '@vitest/coverage-v8'
    ]
  }
};
