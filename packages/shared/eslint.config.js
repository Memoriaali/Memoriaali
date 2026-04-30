import { baseConfig } from '@memoriaali/eslint-config/base';

export default [
  ...baseConfig,
  {
    // Enforce cross-environment compatibility: code must run in both browser and Node.js
    // Restrict use of environment-specific APIs and modules
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'navigator',
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs' },
            { name: 'path' },
            { name: 'os' },
            { name: 'process' },
            { name: 'child_process' },
          ],
        },
      ],
      // Allow external dependencies that are listed in package.json
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
          packageDir: ['.', '../..'],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
      },
    },
  },
  {
    ignores: ['eslint.config.js', 'vitest.config.ts', 'dist/**', 'node_modules/**'],
  },
];
