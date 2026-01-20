import crypto from "crypto";

// Shim provides platform-agnostic utilities
// This is a minimal implementation focusing on what's needed for encryption
const shim = {
  randomBytes: async (count: number): Promise<number[]> => {
    const buffer = crypto.randomBytes(count);
    return Array.from(buffer);
  },

  sjclModule: null as any,

  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  waitForFrame: () => {},
};

export default shim;
