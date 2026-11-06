import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginNext from "@next/eslint-plugin-next";
import typescriptEslint from "typescript-eslint";

export default [
  {
    ignores: ["node_modules/", ".next/", "drizzle/", "*.config.*"],
  },
  ...typescriptEslint.configs.recommended,
  {
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginNext.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      react: { version: "19" },
    },
  },
];
