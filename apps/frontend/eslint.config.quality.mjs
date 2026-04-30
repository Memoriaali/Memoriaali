/**
 * Quality ESLint configuration for Memoriaali v2.0 frontend
 * Uses the quality/CI-optimized React configuration from @memoriaali/eslint-config
 */

import { reactQualityConfig } from '@memoriaali/eslint-config/react/quality';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...reactQualityConfig,
  {
    name: 'memoriaali/frontend-quality-project-specific',
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
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
  },
  {
    name: 'memoriaali/frontend-quality-ignore-generated',
    ignores: ['src/lib/api/generated/**', 'src/lib/generated/**', '.next/*'],
  },
];

export default eslintConfig;
