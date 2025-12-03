module.exports = {
  testMatch: ["**/*.test.ts"],

  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/rnInjectedJs/",
    "<rootDir>/vendor/",
    "<rootDir>/sample_profile_directory/",
  ],

  testEnvironment: "node",

  transform: {
    "\\.(ts|tsx)$": ["ts-jest", { diagnostics: false }],
  },

  setupFilesAfterEnv: [`${__dirname}/src/testing/jest.setup.ts`],
  slowTestThreshold: 40,

  // Increase timeout for network sync targets (WebDAV, OneDrive, etc.)
  testTimeout: 60000,
};
