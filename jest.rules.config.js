/**
 * Firestore security-rules tests. Run with `npm run test:rules`, which starts
 * the Firestore emulator around this suite. Kept separate from `npm test`
 * because these tests need the emulator (and Java).
 */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/rules"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: { "^.+\.[jt]sx?$": ["babel-jest", { presets: ["babel-preset-expo"] }] },
  transformIgnorePatterns: ["/node_modules/"],
  testTimeout: 30000,
};
