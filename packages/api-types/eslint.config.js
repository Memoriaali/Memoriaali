import { baseConfig } from '@memoriaali/eslint-config/base';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    ignores: ['eslint.config.js', 'dist/**', 'node_modules/**'],
  },
];
