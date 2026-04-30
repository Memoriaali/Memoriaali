import prettierConfig from 'eslint-config-prettier';
import { baseConfig } from './base.js';

/**
 * Quality/CI-optimized base ESLint configuration for Memoriaali v2.0
 *
 * Extends the base configuration with strict quality settings:
 * - All type-aware rules enabled
 * - Strict error handling
 * - No console logging allowed
 * - Maximum code quality enforcement
 */
export const baseQualityConfig = [
  ...baseConfig,
  prettierConfig, // Disable ESLint rules that conflict with Prettier
  {
    name: 'memoriaali/base-quality-overrides',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: true, // Enable type-aware linting
      },
    },
    rules: {
      // Strict console rules
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',

      // Strict TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off', // Replaced by unused-imports
      'unused-imports/no-unused-imports': 'error', // Auto-remove unused imports (strict in quality)
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // Enforce all type-aware rules
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': 'error',

      // Strict import rules
      // TODO: This needs to be fixed, but it's a pain to fix and it's not a big deal for development
      // 'import/order': [
      //   'error',
      //   {
      //     groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      //     'newlines-between': 'always',
      //     alphabetize: {
      //       order: 'asc',
      //       caseInsensitive: true,
      //     },
      //   },
      // ],
    },
  },
];

export default baseQualityConfig;
