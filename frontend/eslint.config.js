// ESLint 9 flat config.
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  { ignores: ["dist/", "node_modules/", "src/**/*.js"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        console: "readonly",
        alert: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URL: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        HTMLInputElement: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLDivElement: "readonly",
        WebGL2RenderingContext: "readonly",
        WebGLProgram: "readonly",
        WebGLBuffer: "readonly",
        CanvasRenderingContext2D: "readonly",
        ResizeObserver: "readonly",
        React: "readonly",
        navigator: "readonly",
        performance: "readonly",
        devicePixelRatio: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // TS already checks undefined identifiers; the core rule false-positives on TS types
      "no-undef": "off",
      // BP-2: re-enabled as an error. Underscore-prefixed names are the opt-out
      // (args, locals, and caught errors) so intentional placeholders stay legal.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // BP-2: re-enabled. The earlier crash (eslint 9.39 + @typescript-eslint 8.5
      // options-default bug) is avoided by passing the options object explicitly.
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
    },
  },
];
