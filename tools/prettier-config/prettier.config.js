/* eslint-env node */
/**
 * Prettier configuration for Memoriaali v2.0 monorepo
 *
 * This configuration provides consistent code formatting across all packages
 * in the monorepo. It's designed to work seamlessly with ESLint and TypeScript,
 * focusing on readability and maintainability.
 *
 * Philosophy:
 * - Consistency over personal preference
 * - Readability in code reviews
 * - Minimal diff noise in git
 * - TypeScript and JSX support
 */

export default {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',

  // Indentation and spacing
  tabWidth: 2,
  useTabs: false,

  // Line length and wrapping
  printWidth: 100, // Reduced from 120 to encourage better function call formatting
  proseWrap: 'preserve',

  // JSX specific
  jsxSingleQuote: true,

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'always',

  // End of line
  endOfLine: 'lf',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // HTML whitespace sensitivity (for JSX)
  htmlWhitespaceSensitivity: 'css',

  // Vue files (if needed in future)
  vueIndentScriptAndStyle: false,

  // Plugin-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'preserve',
        tabWidth: 2,
      },
    },
    {
      files: '*.yaml',
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: '*.yml',
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: ['package.json', 'tsconfig.json'],
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: '*.sql',
      options: {
        printWidth: 100,
        tabWidth: 2,
      },
    },
  ],
};
