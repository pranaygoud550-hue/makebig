/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.cjs'],
  testTimeout: 120000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Let Node load ESM natively; map .ts server helpers to plain JS for Jest's resolver.
  transform: {},
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  moduleNameMapper: {
    '\\./mongoServer\\.ts$': '<rootDir>/tests/integration/mocks/mongoServer.js',
    '\\./jwtServer\\.ts$': '<rootDir>/tests/integration/mocks/jwtServer.js',
    '^@/lib/mongoServer$': '<rootDir>/tests/integration/mocks/mongoServer.js',
    '^@/lib/jwtServer$': '<rootDir>/tests/integration/mocks/jwtServer.js',
  },
};
