module.exports = {
  presets: [
    // Compile modern JS to CommonJS for Jest's Node runtime.
    ["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }],
    // Transform JSX (needed if any component is imported transitively).
    ["@babel/preset-react", { runtime: "automatic" }],
  ],
};
