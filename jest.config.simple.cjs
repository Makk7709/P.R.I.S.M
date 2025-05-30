/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/__tests__/api.*.cjs.test.js'
  ],
  collectCoverage: false, // Désactiver pour cette phase
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  moduleDirectories: ['node_modules'],
  moduleFileExtensions: ['js', 'json'],
  transform: {} // Pas de transformation
}; 