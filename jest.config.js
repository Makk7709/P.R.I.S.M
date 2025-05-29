/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '<rootDir>/test/**/*.test.js'
  ],
  
  // Coverage
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/test/',
    '/coverage/',
    '/reports/'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './infrastructure/moralLayer/**/*.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/legacy_tests/setup.js'],

  // Transformations
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.test.js' }]
  },

  // Module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Global setup
  injectGlobals: true,

  // Performance
  maxWorkers: 2,
  maxConcurrency: 2,

  // Timeouts
  testTimeout: 30000,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports/junit',
      outputName: 'js-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Verbose output
  verbose: true,

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Other options
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  resetModules: true,
  
  // Error handling
  bail: 0,
  
  // Cache
  cacheDirectory: '.jest-cache',
  
  // Notifications
  notify: true,
  notifyMode: 'failure-change',
  
  // Debug
  errorOnDeprecated: false,
  
  // Fake timers
  fakeTimers: {
    enableGlobally: false,
    timerLimit: 900000
  },
  
  // Additional transformations
  transformIgnorePatterns: [
    'node_modules/(?!(openai)/)'
  ],
  
  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },

  moduleFileExtensions: ['js', 'json'],

  collectCoverageFrom: [
    'infrastructure/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ]
}; 