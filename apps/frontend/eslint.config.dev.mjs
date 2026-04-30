/**
 * Development ESLint configuration for Memoriaali v2.0 frontend
 * Uses the development-optimized React configuration from @memoriaali/eslint-config
 */

import { reactDevConfig } from '@memoriaali/eslint-config/react/dev';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = [
  ...reactDevConfig,
  {
    name: 'memoriaali/frontend-dev-project-specific',
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
    },

    // Add any frontend-specific dev rule overrides here if needed
  },
  {
    name: 'memoriaali/frontend-dev-ignore-generated',
    ignores: ['src/lib/api/generated/**', 'src/lib/generated/**', '.next/*'],
  },
];

export default config;
