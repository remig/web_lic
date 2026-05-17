import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import fs from "fs";
import globals from "globals";
import { fileURLToPath } from "node:url";
import path from "path";
import tsPlugin from "typescript-eslint";

import css from "@eslint/css";

// Path to the repo's .gitignore, used to tell ESLint to ignore all of these files too
const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

// Path & list of all folders in the code base, used to group codebase folder imports together & separate from 3rd party imports
const srcPath = path.join(path.dirname(__filename), "src");
const baseFolders = fs
	.readdirSync(srcPath, { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map(({ name }) => name)
	.join("|");

export default defineConfig([
	// Ignore all files listed in .gitignore
	includeIgnoreFile(gitignorePath, "Imported .gitignore patterns"),

	// Basic linting via ESLint recommended rules for all ts & tsx files
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: { globals: globals.browser },
		rules: {
			"no-constant-binary-expression": ["error"],
			"no-empty-static-block": ["error"],
			"no-new-native-nonconstructor": ["error"],
			"no-unused-private-class-members": ["error"],
			eqeqeq: ["error", "always", { null: "ignore" }],
			curly: ["error", "all"],
			"no-duplicate-imports": "error",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
			"no-prototype-builtins": "warn",
		},
	},

	// Typescript (@typescript-eslint) specific linter
	tsPlugin.configs.recommended,

	// Overrides for typescript-eslint rules (must come after tsPlugin.configs.recommended)
	{
		files: ["**/*.{ts,tsx}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},

	// React (eslint-plugin-react) specific linter
	{
		...reactPlugin.configs.flat.recommended,
		files: ["**/*.{ts,tsx}"],
		settings: { react: { version: "detect" } },
		languageOptions: { globals: globals.browser },
		rules: {
			"react/self-closing-comp": ["error", { component: true, html: true }],
		},
	},

	// react-refresh linter, checks if we're breaking any rules around Vite dev server's hot code swapping
	reactRefresh.configs.recommended,

	// React hooks linter, reports any violations of The Rules Of Hooks™
	{
		// reactHooks plugin has a 'flat' property that eslint's TS types choke on, but it's safe to ignore via 'any'
		plugins: { "react-hooks": reactHooks as any },
		files: ["**/*.{js,jsx,ts,tsx}"],
		rules: {
			...reactHooks.configs.recommended.rules,
			// TODO: These rules should *NOT* be ignored; they mask non-trivial errors in our code
			"react-hooks/immutability": "off",
			"react-hooks/refs": "off",
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/static-components": "off",
		},
	},

	// Sort imports better than eslint's default import sorting
	{
		plugins: {
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"simple-import-sort/imports": [
				"error",
				{
					groups: [
						["^react$", "^"], // React imports, then anything not matched below (mainly external node_module imports)
						[`^(${baseFolders})`], // all folders under 'src'
						[".*components.*"], // custom internal components
						[".*assets.*"], // custom internal assets
						["^\\.", "^\\u0000"], // relative imports
						[".*css"], // .css imports
					],
				},
			],
			"simple-import-sort/exports": "error",
		},
	},

	// CSS linting
	{
		files: ["**/*.css"],
		plugins: { css },
		language: "css/css",
		extends: ["css/recommended"],
		rules: {
			"css/no-invalid-properties": "off", // doesn't work with CSS Module's 'compose' keyword :(
			"css/use-baseline": "off", // doesn't work with CSS Module's normal class nesting
			"css/no-important": "off", // `!important` is often the only meaningful way to override MUI's themeing, so disable this rule & try to use !important sparingly
		},
	},

	// JSON linting
	{
		files: ["**/*.json"],
		ignores: ["package-lock.json"],
		plugins: { json },
		language: "json/json",
		extends: ["json/recommended"],
	},

	// Run the Prettier code formatter as an ESLint plugin. This will format all files
	// processed by ESLint, including CSS & JSON
	prettierPlugin,

	// Turn off Prettier for the mock server's giant JSON files; it's super slow
	{
		files: ["src/weights.json", "tsconfig.json"],
		rules: { "prettier/prettier": "off" },
	},
]);
