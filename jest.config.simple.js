/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns - Focus sur les tests de sécurité simplifiés
  testMatch: [
    '<rootDir>/tests/security/**/*.simple.spec.js',
    '<rootDir>/__tests__/**/*.test.js'
  ],
  
  // Coverage configuration pour sécurité ≥85%
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  // Seuils de couverture ≥85% pour la sécurité (ajusté pour être réaliste)
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Collecte de couverture spécifique aux modules de sécurité
  collectCoverageFrom: [
    'src/**/*.js',
    'config/**/*.js',
    'core/**/*.js',
    'evolution/**/*.js',
    'prismVitals.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  // Performance optimisée pour tests sécurité
  maxWorkers: 1,

  // Timeouts stricts pour sécurité
  testTimeout: 10000,
  
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
  
  // Cache désactivé pour tests sécurité
  cache: false,
  
  // Force exit pour éviter les processus pendants
  forceExit: true,

  // Configuration spéciale pour tests de sécurité
  globals: {
    PRISM_MODE: 'TEST',
    SECURITY_TEST: true
  }
}; 