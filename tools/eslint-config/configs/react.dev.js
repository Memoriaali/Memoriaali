import { fixupPluginRules } from '@eslint/compat';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { baseDevConfig } from './base.dev.js';

/**
 * Development-optimized React ESLint configuration for Memoriaali v2.0
 *
 * Extends the base development configuration with React-specific rules:
 * - React component patterns and best practices
 * - Lenient accessibility rules for development speed
 * - Console logging allowed for debugging
 * - Performance rules as warnings
 */
export const reactDevConfig = [
  ...baseDevConfig,
  {
    name: 'memoriaali/react-dev',
    files: ['**/*.{tsx,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
        React: 'readonly', // Global React for JSX transform
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: fixupPluginRules(reactPlugin),
      'react-hooks': fixupPluginRules(reactHooksPlugin),
      'jsx-a11y': fixupPluginRules(jsxA11yPlugin),
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React component rules (lenient in dev)
      'react/jsx-uses-react': 'off', // Not needed with new JSX transform
      'react/jsx-uses-vars': 'off',
      'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/display-name': 'warn',
      'react/jsx-key': 'warn', // Warning in dev
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger': 'warn',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'warn', // Warning in dev
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'warn', // Warning in dev
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'warn', // Warning in dev
      'react/no-unescaped-entities': 'warn', // Warning in dev
      'react/no-unknown-property': 'error',
      'react/require-render-return': 'error',
      'react/self-closing-comp': 'warn', // Warning in dev

      // React Hooks rules (strict even in dev)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // JSX style and best practices (warnings in dev)
      'react/jsx-boolean-value': ['warn', 'never'],
      'react/jsx-closing-bracket-location': 'off', // Prettier handles this
      'react/jsx-closing-tag-location': 'off', // Prettier handles this
      'react/jsx-curly-spacing': 'off', // Prettier handles this
      'react/jsx-equals-spacing': 'off', // Prettier handles this
      'react/jsx-indent': 'off', // Prettier handles this
      'react/jsx-indent-props': 'off', // Prettier handles this
      'react/jsx-no-bind': 'off', // Too strict for dev
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-literals': 'off',
      'react/jsx-no-target-blank': 'warn', // Warning in dev
      'react/jsx-pascal-case': 'error',
      'react/jsx-wrap-multilines': 'off', // Prettier handles this

      // Accessibility rules (warnings in dev for speed)
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
      'jsx-a11y/html-has-lang': 'warn',
      'jsx-a11y/iframe-has-title': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/media-has-caption': 'off', // Off in dev
      'jsx-a11y/mouse-events-have-key-events': 'warn',
      'jsx-a11y/no-access-key': 'warn',
      'jsx-a11y/no-autofocus': 'off', // Off in dev
      'jsx-a11y/no-distracting-elements': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'jsx-a11y/scope': 'warn',
      'jsx-a11y/tabindex-no-positive': 'warn',

      // Frontend-specific console rules (lenient in dev)
      'no-console': 'off', // Allow console in development

      // Performance rules for React (warnings in dev)
      'react/jsx-no-constructed-context-values': 'warn',
      'react/no-array-index-key': 'warn',
      'react/no-unstable-nested-components': 'warn',

      // Modern React patterns (warnings in dev)
      'react/function-component-definition': 'off',
      'react/hook-use-state': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/no-object-type-as-default-prop': 'warn',
    },
  },
  {
    name: 'memoriaali/react-dev-test-files',
    files: ['**/*.test.{tsx,jsx}', '**/*.spec.{tsx,jsx}'],
    rules: {
      // Test files can be even more lenient in dev mode
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'react/jsx-no-constructed-context-values': 'off',
      'react/no-array-index-key': 'off',
    },
  },
];

export default reactDevConfig;
