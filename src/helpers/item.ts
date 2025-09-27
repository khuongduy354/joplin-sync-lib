/**
 * Main item helpers - exports all item-related functionality
 *
 * This file serves as the main entry point for all item creation and manipulation functions.
 * The implementation has been organized in the ./item/ folder with focused modules:
 *
 * - item/itemBuilders.ts: Builder pattern classes and factory
 * - item/itemLegacy.ts: Legacy compatibility functions and field definitions
 * - item/itemSerialization.ts: Serialization/deserialization functions
 * - item/itemE2EE.ts: End-to-end encryption helpers
 * - item/itemSetup.ts: Joplin class initialization and setup
 */

// Re-export everything from the item module
export * from "./item/index";
