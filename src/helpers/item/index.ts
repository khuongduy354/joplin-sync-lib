/**
 * Item module - exports all item-related functionality
 *
 * This module provides a complete toolkit for creating and manipulating Joplin items:
 * - Builder pattern for type-safe item creation
 * - Legacy compatibility functions
 * - Serialization/deserialization utilities
 * - End-to-end encryption helpers
 * - Joplin class setup and initialization
 */

// Core functionality
export * from "./itemBuilders";
export * from "./itemLegacy";
export * from "./itemSerialization";
export * from "./itemE2EE";
export * from "./itemSetup";

// Individual modules for granular imports
export * as Builders from "./itemBuilders";
export * as Legacy from "./itemLegacy";
export * as Serialization from "./itemSerialization";
export * as E2EE from "./itemE2EE";
export * as Setup from "./itemSetup";
