/** @type {import('jest').Config} */
export default {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns - Migration GPT-4.1 tests
  testMatch: [
    '<rootDir>/__tests__/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Transform configuration for ESM
  transform: {
    '^.+\\.js$': ['babel-jest', { 
      presets: [['@babel/preset-env', { 
        targets: { node: 'current' },
        modules: 'commonjs'
      }]],
      plugins: []
    }]
  },
  
  // Coverage configuration
  collectCoverage: false, // Désactivé pour premiers tests
  
  // Performance optimisée
  maxWorkers: '50%',

  // Timeouts pour migration
  testTimeout: 15000,
  
  // Reporters
  reporters: ['default'],

  // Verbose pour debug migration
  verbose: true,

  // Mocks et stubs
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Cache pour migration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache-migration',
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '\\.backup\\.'
  ]
}; 