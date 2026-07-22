import js from '@eslint/js';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.vercel/**',
      'playwright-report/**',
      '.aios-core/**',
      '.aiox-core/**',
      '.claude/**',
      '.codex/**',
      '.agents/**',
      'scripts/**',
      'e2e/**',
      'src/app_backup/**',
      'packages/**',
      'scratch/**',
      '.storybook/**',
      'public/**',
      'tests/**',
      'gmail-exporter/**',
      'check-*.js',
      'check-*.mjs',
      'test-*.mjs',
      'jest.setup.js',
      'next.config.js',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
];
