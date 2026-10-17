import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

// Views that still use a kernel or service stand-in directly, because the real call has another shape
// (oc-wasm's worker; /v1/generate's meshes). docs/INTEGRATION.md, "Not behind a port yet", says why for each.
const STANDIN_DIRECT = [
  'src/components/analysis/BeamLayout.tsx',
  'src/components/analysis/Plots.tsx',
  'src/components/editor/optics/CoatingChart.tsx',
  'src/components/editor/optics/OpticalView.tsx',
  'src/components/editor/optics/OpticsPanel.tsx',
  'src/components/editor/optimize/OptimizePane.tsx',
  'src/components/editor/scene3d/Closeup.tsx',
  'src/components/editor/scene3d/HolderDesigner.tsx',
  'src/components/editor/scene3d/holderMesh.ts',
  'src/components/editor/scene3d/layout3d.ts',
  'src/components/views/SimulateView.tsx',
]

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
  // The views and the app reach the stand-ins only through src/ports (light, library, service), so the real ones replace
  // them in one place (src/standins/StandinsProvider.tsx). Stories and tests may use them as data.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    ignores: ['**/*.stories.tsx', '**/*.test.ts', ...STANDIN_DIRECT],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/standins/**'], message: 'Reach the stand-ins through src/ports (docs/INTEGRATION.md).' }] }],
    },
  },
])
