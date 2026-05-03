module.exports = {
  presets: [
    // Compile modern JS to CommonJS for Jest's Node runtime.
    ["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }],
    // Transform JSX (needed if any component is imported transitively).
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
  plugins: [
    // Vite uses import.meta.env for environment variables, which is not valid
    // CommonJS syntax and causes a parse error in Jest.
    // This plugin replaces `import.meta` with an empty-env stub so that any
    // file referencing import.meta.env can be parsed and executed by Jest.
    // All VITE_* lookups return undefined, isFirebaseConfigured stays false,
    // and tests run entirely against the local (non-Firebase) code paths.
    function transformImportMeta() {
      return {
        visitor: {
          MetaProperty(path) {
            if (
              path.node.meta.name === "import" &&
              path.node.property.name === "meta"
            ) {
              // Replace import.meta with ({ env: {} }) so downstream
              // property accesses (e.g. .env.VITE_KEY) resolve to undefined.
              path.replaceWithSourceString('({ env: {} })');
            }
          },
        },
      };
    },
  ],
};
