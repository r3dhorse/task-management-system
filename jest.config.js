const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'node-appwrite': '<rootDir>/jest/mocks/node-appwrite.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch-native|node-appwrite|hono|@tanstack)/)'
  ],
  testMatch: [
    '<rootDir>/jest/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/services/service-management.test.tsx',
    '<rootDir>/src/__tests__/components/file-upload-download.test.tsx',
    '<rootDir>/src/__tests__/tasks/cross-workspace-tasks.test.tsx',
    '<rootDir>/src/__tests__/tasks/follower-management-chat.test.tsx',
    '<rootDir>/src/__tests__/workspaces/enhanced-workspace-management.test.tsx',
    '<rootDir>/src/__tests__/integration/full-workflow-integration.test.tsx',
    '<rootDir>/src/__tests__/error-handling/comprehensive-error-edge-cases.test.tsx',
    '<rootDir>/src/__tests__/auth/enhanced-auth-service-based.test.tsx',
    '<rootDir>/src/__tests__/mobile/mobile-projects.test.tsx',
    '<rootDir>/src/__tests__/mobile/mobile-integration.test.tsx',
    '<rootDir>/src/__tests__/mobile/mobile-tasks.test.tsx',
    '<rootDir>/src/__tests__/mobile/mobile-workspaces.test.tsx',
    '<rootDir>/src/__tests__/mobile/mobile-files.test.tsx',
  ],
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)