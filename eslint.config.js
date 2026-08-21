import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
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
      // As telas carregam dados do Supabase em useEffect no mount, que é o
      // padrão pretendido aqui — sair dele exigiria uma lib de data fetching.
      // A regra 'react-hooks/purity' fica ligada de propósito: foi ela que
      // pegou as chaves duplicadas de Date.now() na lista de UCs.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
