import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Lint is only useful if a reported error means something is actually wrong.
// Before this config was tuned it reported 382 problems, of which 122 were
// `process` and `Buffer` being flagged in src/api-handlers: server code checked
// against browser globals. Nobody reads a list like that, so nothing got fixed.
//
// The split below declares the right globals per area, and demotes the
// opinionated React rules to warnings so that an ERROR means a real defect
// (an undefined identifier, unused code) rather than a style preference.
export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'node_modules', 'public']),

  // Browser code: the React app.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/api-handlers/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Empty catch blocks are used deliberately throughout this codebase, each
      // with a comment saying why the failure is safe to swallow (storage
      // blocked in private mode, a non-critical background write, and so on).
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Real signal, kept as errors.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Worth seeing, not worth blocking on. These fire in the hundreds across
      // working, shipped code; as errors they drowned out the two genuine
      // undefined-variable bugs that were hiding in the same output.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },

  // Server code: Vercel serverless handlers and the catch-all router. Node
  // globals, no JSX, no React rules.
  {
    files: ['src/api-handlers/**/*.js', 'api/**/*.js', 'scripts/**/*.{js,cjs,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
])
