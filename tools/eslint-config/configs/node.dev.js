import nPlugin from 'eslint-plugin-n';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';

import { baseDevConfig } from './base.dev.js';

/**
 * Development-optimized Node.js ESLint configuration for Memoriaali v2.0
 *
 * Extends the base development configuration with Node.js-specific rules:
 * - Node.js environment and globals
 * - Lenient Node.js rules for development speed
 * - Console logging allowed for debugging
 */
export const nodeDevConfig = [
  ...baseDevConfig,
  {
    name: 'memoriaali/node-dev',
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      n: fixupPluginRules(nPlugin),
    },
    rules: {
      // Node.js specific rules (lenient for development)
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-missing-import': 'off',
      'n/no-missing-require': 'off',
      'n/no-unpublished-import': 'off',
      'n/no-unpublished-require': 'off',
      'n/no-extraneous-import': 'off',
      'n/no-extraneous-require': 'off',

      // Security rules (warnings in dev)
      'n/no-new-require': 'warn',
      'n/no-path-concat': 'warn',
      'n/no-process-exit': 'warn',
      'n/no-sync': 'off', // Allow sync operations in dev

      // Process and environment handling
      'n/prefer-global/process': ['error', 'always'],
      'n/prefer-global/console': ['error', 'always'],
      'n/prefer-global/buffer': ['error', 'always'],
      'n/prefer-global/url-search-params': ['error', 'always'],
      'n/prefer-global/url': ['error', 'always'],

      // Module system preferences (warnings in dev)
      'n/prefer-promises/dns': 'warn',
      'n/prefer-promises/fs': 'warn',

      // Performance considerations
      'n/no-process-env': 'off', // We need process.env in backend

      // Error handling (warnings in dev)
      'n/handle-callback-err': 'warn',
      'n/no-callback-literal': 'warn',
    },
  },
  {
    name: 'memoriaali/node-dev-test-files',
    files: [
      '**/*.test.{js,ts}',
      '**/*.spec.{js,ts}',
      '**/test/**/*',
      '**/tests/**/*',
    ],
    rules: {
      // Test files can be even more lenient in dev mode
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'n/no-process-env': 'off',
      'n/no-sync': 'off',
      'n/no-process-exit': 'off',
    },
  },
];

export default nodeDevConfig;
