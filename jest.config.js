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

  // setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
  slowTestThreshold: 40,
};
