import nPlugin from 'eslint-plugin-n';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';

import { baseQualityConfig } from './base.quality.js';

/**
 * Quality/CI-optimized Node.js ESLint configuration for Memoriaali v2.0
 *
 * Extends the base quality configuration with strict Node.js-specific rules:
 * - Node.js environment and globals
 * - Strict Node.js security and performance rules
 * - No console logging allowed
 * - Maximum code quality enforcement
 */
export const nodeQualityConfig = [
  ...baseQualityConfig,
  {
    name: 'memoriaali/node-quality',
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
      // Node.js specific rules (strict for quality)
      'n/no-unsupported-features/es-syntax': 'off', // We use TypeScript/Babel
      'n/no-missing-import': 'off', // TypeScript handles this
      'n/no-missing-require': 'off', // TypeScript handles this
      'n/no-unpublished-import': 'off', // Monorepo context
      'n/no-unpublished-require': 'off', // Monorepo context
      'n/no-extraneous-import': 'off', // Handled by import plugin
      'n/no-extraneous-require': 'off', // Handled by import plugin

      // Security rules (strict)
      'n/no-new-require': 'error',
      'n/no-path-concat': 'error',
      'n/no-process-exit': 'error',
      'n/no-sync': 'error',

      // Backend-specific console rules (strict)
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],

      // Process and environment handling
      'n/prefer-global/process': ['error', 'always'],
      'n/prefer-global/console': ['error', 'always'],
      'n/prefer-global/buffer': ['error', 'always'],
      'n/prefer-global/url-search-params': ['error', 'always'],
      'n/prefer-global/url': ['error', 'always'],

      // Module system preferences (strict)
      'n/prefer-promises/dns': 'error',
      'n/prefer-promises/fs': 'error',

      // Performance considerations
      'n/no-process-env': 'off', // We need process.env in backend

      // Error handling (strict)
      'n/handle-callback-err': 'error',
      'n/no-callback-literal': 'error',

      // Express.js and API development patterns
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: false, // Allow async functions as Express handlers
            attributes: false,
          },
        },
      ],

      // Database and async patterns
      'no-return-await': 'off', // TypeScript equivalent below
      '@typescript-eslint/return-await': 'error',

      // Backend security practices
      'no-new-object': 'error',
      'no-array-constructor': 'error',
      '@typescript-eslint/no-array-constructor': 'error',
    },
  },
  {
    name: 'memoriaali/node-quality-test-files',
    files: [
      '**/*.test.{js,ts}',
      '**/*.spec.{js,ts}',
      '**/test/**/*',
      '**/tests/**/*',
    ],
    rules: {
      // Test files can be slightly more lenient even in quality mode
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'n/no-process-env': 'off',
      'n/no-sync': 'off',
    },
  },
];

export default nodeQualityConfig;
