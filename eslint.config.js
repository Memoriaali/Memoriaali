/**
 * Root ESLint configuration for Memoriaali v2.0 monorepo
 *
 * This configuration applies to the root level and serves as the default
 * for packages that don't have their own specific configuration.
 */

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    name: 'memoriaali/root-overrides',
    files: ['*.{js,ts,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Root level files can be more lenient
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    name: 'memoriaali/root-ignores',
    ignores: [
      'legacy/**',
      '_process/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/target/**',
      '**/node_modules/**',
      '**/generated/**',
      '**/.generated/**',
      '**/out/**',
      '**/.cache/**',
      '**/temp/**',
      '**/tmp/**',
    ],
  },
];
