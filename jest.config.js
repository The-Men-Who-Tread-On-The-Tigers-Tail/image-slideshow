module.exports = {
  projects: [
    {
      displayName: 'backend',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js'],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/public'],
      testMatch: ['**/*.test.js'],
      moduleFileExtensions: ['js'],
    },
  ],
};
