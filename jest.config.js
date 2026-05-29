/**
 * Jest Configuration
 * Used for running unit and integration tests
 */

import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@upstash/redis$': '<rootDir>/src/__mocks__/@upstash/redis.ts',
    '^@upstash/qstash$': '<rootDir>/src/__mocks__/@upstash/qstash.ts',
    '^remark-gfm$': '<rootDir>/src/__mocks__/remark-gfm.ts',
    '^react-markdown$': '<rootDir>/src/__mocks__/react-markdown.ts',
    '^@/components/booking/TemplateHero$': '<rootDir>/src/__mocks__/components/booking/TemplateHero.tsx',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@upstash|@stripe|jose|@supabase)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.spec.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig)
