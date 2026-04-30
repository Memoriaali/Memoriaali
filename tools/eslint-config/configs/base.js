import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import boundaries from 'eslint-plugin-boundaries';
import unusedImports from 'eslint-plugin-unused-imports';

/**
 * Base ESLint configuration for Memoriaali v2.0
 *
 * This configuration provides the foundation for all TypeScript projects
 * in the monorepo, focusing on:
 * - Essential type safety and modern JavaScript/TypeScript practices
 * - Basic import organization and dependency management
 * - Promise handling and async/await patterns
 * - Core code quality and maintainability rules
 *
 * Specialized configurations (dev/quality) extend this base with
 * environment-specific rules and strictness levels.
 */
export const baseConfig = [
  js.configs.recommended,
  {
    name: 'memoriaali/base',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      promise: promisePlugin,
      boundaries,
      'unused-imports': unusedImports,
    },
    rules: {
      // Disable JavaScript rules that are handled by TypeScript
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      'no-undef': 'off', // TypeScript handles this
      'no-redeclare': 'off', // Handled by @typescript-eslint/no-redeclare

      // Essential TypeScript rules (applied in all environments)
      '@typescript-eslint/no-unused-vars': 'off', // Replaced by unused-imports/no-unused-vars
      'unused-imports/no-unused-imports': 'error', // Auto-remove unused imports
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
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Basic import organization rules
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.{js,ts,tsx}',
            '**/*.spec.{js,ts,tsx}',
            '**/test/**/*',
            '**/tests/**/*',
            '**/__tests__/**/*',
            '**/__specs__/**/*',
            '**/vitest.config.{js,ts}',
            '**/vite.config.{js,ts}',
            '**/eslint.config.{js,ts,mjs}',
            '**/setup.{js,ts}',
          ],
        },
      ],

      // Essential promise and async/await rules
      'promise/always-return': 'error',
      'promise/no-return-wrap': 'error',
      'promise/param-names': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-native': 'off',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/avoid-new': 'off',
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'warn',
      'promise/valid-params': 'warn',

      // Core code quality rules (non-controversial)
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-void': 'error',
      'no-with': 'error',

      // Code style preferences (Prettier will handle formatting)
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',

      // Error prevention
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unreachable-loop': 'error',
      'no-unused-private-class-members': 'error',
      'no-use-before-define': 'off', // TypeScript handles this
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          typedefs: true,
        },
      ],

      // Performance
      'no-await-in-loop': 'warn',
      'prefer-object-spread': 'error',

      // Security and reliability
      'no-constructor-return': 'error',
      'no-new-native-nonconstructor': 'error',

      // --- Architectural rules ---
      // Prevent circular dependencies in packages
      'import/no-cycle': ['error', { maxDepth: '∞', ignoreExternal: true }],
      // Prevent cross-app imports in apps/*
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'apps/*',
              allow: [],
            },
          ],
        },
      ],
    },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/*/src' },
        { type: 'package', pattern: 'packages/*/src' },
      ],
    },
  },
  {
    name: 'memoriaali/base-ignores',
    ignores: [
      '.generated/**',
      '.next/**',
      '.pnpm',
      '**/.cache/**',
      '**/.generated/**',
      '**/.turbo/**',
      '**/.turbo/**',
      '**/*.d.ts',
      '**/coverage/**',
      '**/generated/**',
      '**/out/**',
      '**/temp/**',
      '**/tmp/**',
      'build/**',
      'coverage/**',
      'dist/**',
      'generated/**',
      'node_modules/**',
      'out/**',
      'target/**',
    ],
  },
];

export default baseConfig;
