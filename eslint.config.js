import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

// As optikit-v2's frontend (frontend/eslint.config.js); storybook-static is the lab's own build output.
export default tseslint.config([
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // The entry point, Storybook's setup and the demo panels are not component modules: fast refresh does not apply.
  {
    files: ['src/main.tsx', '.storybook/preview.tsx', 'src/demo/panelContent.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
