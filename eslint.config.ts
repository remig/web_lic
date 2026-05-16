import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
// @ts-ignore - no type declarations for this package
import noOnlyTests from 'eslint-plugin-no-only-tests';

// `import.meta.dirname` requires @types/node; use URL-based fallback instead
const projectRoot = new URL('.', import.meta.url).pathname;

const tsSpecificRules = {
	'@typescript-eslint/await-thenable': 'warn',
	'@typescript-eslint/no-unused-vars': ['warn', {varsIgnorePattern: '^_', argsIgnorePattern: '^_'}],
	'@typescript-eslint/no-unused-expressions': 'warn',
	'no-unused-vars': 'off',  // defer to @typescript-eslint/no-unused-vars for TS files
} as const;

const vueSpecificRules = {
	'vue/attribute-hyphenation': ['warn', 'always', {ignore: ['onSubmit']}],
	'vue/no-v-html': 'off',
	'vue/multi-word-component-names': 'off',
	'vue/no-use-v-if-with-v-for': 'warn',
	'vue/require-prop-types': 'off',
	'vue/require-default-prop': 'off',
} as const;

export default [
	{
		ignores: [
			'static/**', 'dist/**', 'test/**',
			'eslint.config.ts', 'vite.config.ts', 'gh_dash_eslint.ts',
		],
	},
	js.configs.recommended,
	// Browser globals and global rule overrides for all files
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			'no-only-tests': noOnlyTests,
		},
		rules: {
			'accessor-pairs': 'error',
			'array-callback-return': 'error',
			'block-scoped-var': 'error',
			'class-methods-use-this': 'error',
			complexity: ['error', 45],
			'consistent-return': 'error',
			curly: 'error',
			'default-case': 'off',
			'dot-notation': 'error',
			eqeqeq: ['error', 'always', {'null': 'never'}],
			'for-direction': 'error',
			'guard-for-in': 'error',
			'init-declarations': 'off',
			'no-alert': 'error',
			'no-caller': 'error',
			'no-case-declarations': 'error',
			'no-compare-neg-zero': 'error',
			'no-cond-assign': 'warn',
			'no-console': 'warn',
			'no-constant-condition': 'warn',
			'no-control-regex': 'error',
			'no-debugger': 'warn',
			'no-delete-var': 'error',
			'no-div-regex': 'error',
			'no-dupe-args': 'error',
			'no-dupe-keys': 'error',
			'no-duplicate-case': 'error',
			'no-else-return': 'error',
			'no-empty': 'warn',
			'no-empty-character-class': 'error',
			'no-empty-function': 'off',
			'no-empty-pattern': 'error',
			'no-eq-null': 'off',
			'no-eval': 'error',
			'no-ex-assign': 'error',
			'no-extend-native': 'error',
			'no-extra-boolean-cast': 'error',
			'no-extra-bind': 'error',
			'no-extra-label': 'error',
			'no-fallthrough': 'warn',
			'no-func-assign': 'error',
			'no-global-assign': 'error',
			'no-implicit-coercion': 'error',
			'no-implicit-globals': 'error',
			'no-implied-eval': 'error',
			'no-inner-declarations': 'error',
			'no-invalid-regexp': 'error',
			'no-invalid-this': 'warn',
			'no-irregular-whitespace': 'error',
			'no-iterator': 'error',
			'no-label-var': 'error',
			'no-labels': 'error',
			'no-lone-blocks': 'error',
			'no-loop-func': 'error',
			'no-magic-numbers': 'off',
			'no-new': 'error',
			'no-new-func': 'error',
			'no-new-wrappers': 'error',
			'no-obj-calls': 'error',
			'no-octal': 'error',
			'no-octal-escape': 'error',
			'no-only-tests/no-only-tests': 'error',
			'no-param-reassign': 'off',
			'no-proto': 'error',
			'no-prototype-builtins': 'off',
			'no-redeclare': 'error',
			'no-return-assign': 'error',
			'no-self-assign': 'error',
			'no-self-compare': 'error',
			'no-sequences': 'error',
			'no-shadow': 'error',
			'no-unmodified-loop-condition': 'error',
			'no-unreachable': 'warn',
			'no-unused-expressions': 'off',
			'no-unused-labels': 'warn',
			'no-use-before-define': ['error', {functions: false}],
			'no-useless-call': 'error',
			'no-useless-concat': 'error',
			'no-useless-escape': 'error',
			'no-useless-return': 'error',
			'no-var': 'error',
			'no-void': 'error',
			'no-with': 'error',
			'prefer-const': 'warn',
			radix: 'error',
		},
	},
	...pluginVue.configs['flat/essential'],
	// Vue-specific rules
	{
		files: ['**/*.vue'],
		rules: vueSpecificRules,
	},
	// .ts files: @typescript-eslint/parser as main parser + TS rules
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: true,
				tsconfigRootDir: projectRoot,
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin as any,
		},
		rules: tsSpecificRules,
	},
	// .vue files: nest tsParser inside vue-eslint-parser (set by flat/essential)
	{
		files: ['**/*.vue'],
		languageOptions: {
			parserOptions: {
				parser: tsParser,
				extraFileExtensions: ['.vue'],
				project: true,
				tsconfigRootDir: projectRoot,
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin as any,
		},
		rules: tsSpecificRules,
	},
];
