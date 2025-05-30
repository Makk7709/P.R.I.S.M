/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns - Migration GPT-4.1 tests
  testMatch: [
    '<rootDir>/__tests__/migration-gpt41.test.js'
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': ['babel-jest', { 
      presets: [['@babel/preset-env', { 
        targets: { node: 'current' },
        modules: 'commonjs'
      }]],
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }]
  },
  
  // Coverage configuration
  collectCoverage: false,
  
  // Performance optimisée
  maxWorkers: 1,

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
  cache: false,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '\\.backup\\.'
  ]
}; 