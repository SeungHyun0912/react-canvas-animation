import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
    globalIgnores(['dist']),
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
        rules: {
            'indent': ['error', 4, { SwitchCase: 1 }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'always'],
            'computed-property-spacing': ['error', 'always'],
            'space-in-parens': ['error', 'always'],
            'keyword-spacing': ['error', { 
                'overrides': { 
                    'if': { 'after': false },
                    'for': { 'after': false },
                    'while': { 'after': false },
                    'switch': { 'after': false },
                    'catch': { 'after': false },
                    'with': { 'after': false }
                } 
            }]
        },
    },
])
