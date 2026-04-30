/**
 * Quality ESLint configuration for Memoriaali v2.0 backend
 * Uses the quality/CI-optimized Node.js configuration from @memoriaali/eslint-config
 */

import { nodeQualityConfig } from '@memoriaali/eslint-config/node/quality';

export default [
  ...nodeQualityConfig,
  {
    name: 'memoriaali/backend-quality-project-specific',
    files: ['src/**/*.{js,ts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json', // Enable type-aware linting
      },
    },
    // Add any backend-specific quality rule overrides here if needed
  },
  {
    name: 'memoriaali/backend-quality-mock-files',
    files: ['src/**/__mocks__/**/*', 'src/**/*.mock.{js,ts}'],
    rules: {
      // Mock files can import test dependencies
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    name: 'memoriaali/backend-quality-fs-services',
    files: ['src/api/sip/sip.service.ts', 'src/api/uploads/uploads.service.ts'],
    rules: {
      // These services require dynamic file system operations by design
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
];
