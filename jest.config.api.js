/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns pour les tests API
  testMatch: [
    '<rootDir>/__tests__/api.*.cjs.test.js'
  ],
  
  // Coverage
  collectCoverage: true,
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Seuil de couverture pour cette phase (commencer à 80%)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Timeouts
  testTimeout: 10000,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'api-phase1-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Verbose
  verbose: true,

  // Mock handling
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Cache
  cacheDirectory: '.jest-cache-api-phase1',
  
  // Module resolution
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'json'],

  // Ignore patterns pour cette phase
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
    '/tests/',
    '/coverage/',
    '/reports/',
    '/legacy_tests/',
    '/__tests__/.*\\.test\\.js$' // Ignorer les tests ES modules pour cette config
  ],

  // Collecte de couverture ciblée
  collectCoverageFrom: [
    'simple-dashboard.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ]
}; 