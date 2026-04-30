/**
 * Development ESLint configuration for Memoriaali v2.0 backend
 * Uses the development-optimized Node.js configuration from @memoriaali/eslint-config
 */

import { nodeDevConfig } from '@memoriaali/eslint-config/node/dev';

export default [
  ...nodeDevConfig,
  {
    name: 'memoriaali/backend-dev-project-specific',
    files: ['src/**/*.{js,ts}'],
    // Add any backend-specific dev rule overrides here if needed
  },
  {
    name: 'memoriaali/backend-test-files',
    files: [
      'src/**/__specs__/**/*.{js,ts}',
      'src/**/__mocks__/**/*.{js,ts}',
      'src/**/*.spec.{js,ts}',
      'src/**/*.test.{js,ts}',
    ],
    rules: {
      // Allow test frameworks in devDependencies for test files
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
    },
  },
];
