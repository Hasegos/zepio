import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  { ignores: ["dist", ".astro", "node_modules"] },
  js.configs.recommended,
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ...jsxA11y.flatConfigs.recommended.languageOptions,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]", argsIgnorePattern: "^[A-Z]" }],
    },
  },
  {
    files: ["src/lib/**/*.js", "src/games/registry.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react/*", "react-dom", "react-dom/*"] },
      ],
    },
  },
];