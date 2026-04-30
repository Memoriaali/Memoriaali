import prettierConfig from 'eslint-config-prettier';
import { baseConfig } from './base.js';

/**
 * Development-optimized base ESLint configuration for Memoriaali v2.0
 *
 * Extends the base configuration with development-friendly settings:
 * - Faster linting by disabling type-aware rules
 * - More lenient rules for development speed
 * - Console logging allowed for debugging
 */
export const baseDevConfig = [
  ...baseConfig,
  prettierConfig, // Disable ESLint rules that conflict with Prettier
  {
    name: 'memoriaali/base-dev-overrides',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: false, // Disable type-aware linting for speed
      },
    },
    rules: {
      // Development-friendly console rules
      'no-console': 'off', // Allow console in development

      // More lenient TypeScript rules for development
      '@typescript-eslint/no-unused-vars': 'off', // Replaced by unused-imports
      'unused-imports/no-unused-imports': 'warn', // Auto-remove unused imports (warning in dev)
      'unused-imports/no-unused-vars': [
        'warn', // Warning only in dev mode
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Off in dev mode

      // Disable all type-aware rules for faster development linting
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-misused-promises': 'off',

      // More lenient import rules
      // TODO: This needs to be fixed, but it's a pain to fix and it's not a big deal for development
      'import/order': 'off', // Auto-fixable, but can be slow
    },
  },
];

export default baseDevConfig;
