/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns pour la route API
  testMatch: [
    '<rootDir>/__tests__/api.*.test.js'
  ],
  
  // Support ES modules
  preset: null,
  
  // Module transformation
  transform: {},
  
  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Coverage pour la phase 1
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/legacy_tests/',
    '/test/',
    '/coverage/',
    '/reports/'
  ],
  
  // Seuil de couverture strict (>95% comme demandé)
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Global setup
  injectGlobals: true,

  // Performance
  maxWorkers: 1,
  maxConcurrency: 1,

  // Timeouts pour tests API
  testTimeout: 10000,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'api-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Verbose output
  verbose: true,

  // Mock handling
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  resetModules: true,
  
  // Error handling
  bail: 0,
  
  // Cache
  cacheDirectory: '.jest-cache-api',
  
  // Module paths
  moduleDirectories: ['node_modules'],

  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },

  moduleFileExtensions: ['js', 'mjs', 'json'],

  collectCoverageFrom: [
    'simple-dashboard.js',
    'backend/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Mock patterns
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  
  // Transformation ignore patterns
  transformIgnorePatterns: ['node_modules/(?!(supertest|express)/)']
}; 