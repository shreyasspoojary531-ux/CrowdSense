/** @type {import('jest').Config} */
module.exports = {
  // Use node environment for pure logic tests (no DOM needed).
  testEnvironment: "node",

  // Transform ESM and JSX files using babel-jest.
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },

  // Look for tests under the /tests directory.
  testMatch: ["**/tests/**/*.test.js"],

  // Ignore node_modules during transforms (except firebase which ships as ESM).
  transformIgnorePatterns: ["/node_modules/(?!(firebase)/)"],

  // Collect code coverage from source files.
  collectCoverageFrom: [
    "src/utils/**/*.js",
    "src/data/**/*.js",
    "!src/**/*.test.js",
  ],
};
