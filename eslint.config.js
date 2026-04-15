import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'backups/', 'server/backups/', '*.cjs', '*.mjs', 'tmp/', 'tmp_*.js']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'no-constant-binary-expression': 'off',
      'no-empty': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off'
    },
  },
  {
    files: ['server/**/*.js', 'server/**/*.mjs', 'server/**/*.cjs', 'api/**/*.js', 'tmp/**/*.js', 'tmp_*.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'no-constant-binary-expression': 'off',
      'no-empty': 'off',
      'no-undef': 'off'
    }
  }
])
