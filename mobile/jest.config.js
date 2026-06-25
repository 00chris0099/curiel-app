module.exports = {
    testMatch: ['**/__tests__/**/*.test.js'],
    testEnvironment: 'node',
    verbose: true,
    clearMocks: true,
    testTimeout: 15000,
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@react-native|react-native|@expo)/)',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
