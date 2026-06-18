module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverage: false,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetModules: true,
    testTimeout: 30000,
};
