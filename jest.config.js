/**
 * Jest Configuration
 * Used for running unit and integration tests
 */

// For Next.js 9.3.3, we use a simplified config without next/jest wrapper
const config = {
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Application aliases
    '^@/(.*)$': '<rootDir>/src/$1',

    // Next.js module mocks (fixes Jest module resolution)
    '^next/server$': '<rootDir>/src/__mocks__/next/server.ts',
    '^next/navigation$': '<rootDir>/src/__mocks__/next/navigation.ts',
    '^next/headers$': '<rootDir>/src/__mocks__/next/headers.ts',
    '^next/image$': '<rootDir>/src/__mocks__/next/image.ts',
    '^next/script$': '<rootDir>/src/__mocks__/next/script.ts',
    '^next/og$': '<rootDir>/src/__mocks__/next/og.ts',
    '^next/cache$': '<rootDir>/src/__mocks__/next/cache.ts',

    // Third-party mocks
    '^@upstash/redis$': '<rootDir>/src/__mocks__/@upstash/redis.ts',
    '^@upstash/qstash$': '<rootDir>/src/__mocks__/@upstash/qstash.ts',
    '^remark-gfm$': '<rootDir>/src/__mocks__/remark-gfm.ts',
    '^react-markdown$': '<rootDir>/src/__mocks__/react-markdown.ts',
    '^react-gtag$': '<rootDir>/src/__mocks__/react-gtag.ts',
    '^sharp$': '<rootDir>/src/__mocks__/sharp.ts',
    '^@/components/booking/TemplateHero$': '<rootDir>/src/__mocks__/components/booking/TemplateHero.tsx',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@upstash|@stripe|jose|@supabase|lucide-react)/)',
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
  testPathIgnorePatterns: [
    'consent.*test.ts',
    'analytics/repository.e2e.test.ts',
    'requireRole.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

export default config;
