module.exports = {
  // testMatch: ["**/*.test.js"],

  // testPathIgnorePatterns: [
  //   "<rootDir>/node_modules/",
  //   "<rootDir>/rnInjectedJs/",
  //   "<rootDir>/vendor/",
  // ],

  testEnvironment: "node",

  transform: {
    "\\.(ts|tsx)$": "ts-jest",
  },

  // setupFilesAfterEnv: [`${__dirname}/jest.setup.js`],
  slowTestThreshold: 40,
};
