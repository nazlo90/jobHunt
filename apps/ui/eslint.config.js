// @ts-check
const tseslint = require('typescript-eslint');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const templateParser = require('@angular-eslint/template-parser');

module.exports = tseslint.config(
  {
    ignores: ['.angular/**', 'dist/**', 'node_modules/**'],
  },
  // TypeScript files
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.ts'],
  })),
  {
    files: ['src/**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@angular-eslint': angular,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/use-lifecycle-interface': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  // HTML template files
  {
    files: ['src/**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    languageOptions: {
      parser: templateParser,
    },
    rules: {
      '@angular-eslint/template/banana-in-box': 'error',
    },
  },
);
