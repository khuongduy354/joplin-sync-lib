/**
 * Jest Test Filtering Setup
 *
 * Environment variables:
 * - TEST_NO_CONFLICT_API: Run read + create only tests (default: true)
 * - TEST_CONFLICTABLE_API: Run update/conflict tests (default: false)
 * - TEST_E2EE: Run e2ee tests (default: false)
 *
 * Usage:
 * - npm test                    -> runs no-conflict-api tests only
 * - npm run test:conflictable   -> runs conflictable (update) tests
 * - npm run test:e2e            -> runs e2ee tests
 * - npm run test:all            -> runs all tests
 */

export type TestCategory = "no-conflict" | "conflictable" | "e2ee";

// Parse environment variables with defaults
const testNoConflict = process.env.TEST_NO_CONFLICT_API !== "false";
const testConflictable = process.env.TEST_CONFLICTABLE_API === "true";
const testE2EE = process.env.TEST_E2EE === "true";

/**
 * Determine if a test category should run based on environment config
 */
export function shouldRunCategory(category: TestCategory): boolean {
  switch (category) {
    case "no-conflict":
      return testNoConflict;
    case "conflictable":
      return testConflictable;
    case "e2ee":
      return testE2EE;
    default:
      return true;
  }
}

/**
 * Conditional describe block - skips entire suite if category is disabled
 */
export function describeIfCategory(
  category: TestCategory,
  name: string,
  fn: () => void
) {
  if (shouldRunCategory(category)) {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
}

/**
 * Conditional it block - skips test if category is disabled
 */
export function itIfCategory(
  category: TestCategory,
  name: string,
  fn: () => Promise<void> | void,
  timeout?: number
) {
  if (shouldRunCategory(category)) {
    it(name, fn, timeout);
  } else {
    it.skip(name, fn, timeout);
  }
}

// Export the test configuration for debugging
export const testConfig = {
  noConflict: testNoConflict,
  conflictable: testConflictable,
  e2ee: testE2EE,
};

// Log test configuration on startup (only if not in silent mode)
if (process.env.TEST_LOG_CONFIG === "true") {
  console.log("Test Configuration:", testConfig);
}
