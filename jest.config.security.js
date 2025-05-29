/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns - Focus sur les tests de sécurité
  testMatch: [
    '<rootDir>/tests/security/**/*.spec.js',
    '<rootDir>/__tests__/**/*.test.js'
  ],
  
  // Coverage configuration pour sécurité ≥95%
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/test/',
    '/coverage/',
    '/reports/',
    '/dashboard/',
    '/logs/',
    '/backups/',
    '/data/',
    '/ui/',
    '/archives/',
    '/docs/',
    '/legacy_tests/',
    '/prism.egg-info/',
    '/.venv/',
    '/.pytest_cache/',
    '/.jest-cache/',
    '/backend/',
    '/constants/',
    '/infrastructure/',
    '/orchestration/',
    '/architecture/',
    '/integration/',
    '/utils/',
    '/scripts/',
    '/monitoring/'
  ],
  
  // Seuils de couverture ≥95% pour la sécurité
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/core/TrustContext.js': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    './config/security.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './core/KernelBus.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './evolution/selfImprovementEngine.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Collecte de couverture spécifique aux modules de sécurité
  collectCoverageFrom: [
    'src/core/TrustContext.js',
    'config/security.js',
    'core/KernelBus.js',
    'evolution/selfImprovementEngine.js',
    'prismVitals.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/tests/**',
    '!**/test/**',
    '!**/coverage/**'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/security/setup.js'],

  // ES modules support
  preset: null,
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module resolution
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Global setup
  injectGlobals: true,

  // Performance optimisée pour tests sécurité
  maxWorkers: 1,
  maxConcurrency: 1,

  // Timeouts stricts pour sécurité
  testTimeout: 30000,
  
  // Reporters avec export JSON pour vérification
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports',
      outputName: 'security-test-results.xml',
      classNameTemplate: 'Security.{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Verbose output pour audit
  verbose: true,

  // Mocks et stubs
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  resetModules: true,
  
  // Error handling strict
  bail: 1, // Arrêter au premier échec pour sécurité
  
  // Cache désactivé pour tests sécurité
  cache: false,
  
  // Notifications
  notify: true,
  notifyMode: 'always',
  
  // Debug
  errorOnDeprecated: true,
  
  // Fake timers pour tests temporels
  fakeTimers: {
    enableGlobally: true,
    timerLimit: 30000
  },
  
  // Transformations
  transformIgnorePatterns: [
    'node_modules/(?!(natural|winston)/)'
  ],
  
  // Module paths
  moduleDirectories: ['node_modules', 'src', '.'],

  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },

  moduleFileExtensions: ['js', 'json'],

  // Configuration spéciale pour tests de sécurité
  globals: {
    PRISM_MODE: 'TEST',
    SECURITY_TEST: true
  },

  // Détection de fuites mémoire
  detectLeaks: true,
  detectOpenHandles: true,

  // Force exit pour éviter les processus pendants
  forceExit: true
}; 