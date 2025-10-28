# Joplin Sync Library - AI Coding Agent Instructions

## Architecture Overview

This is a sync library extracted from Joplin, designed to work as a REST API-like library for syncing notes across different storage providers.

### Core Component Structure

```
SyncTarget (e.g., JoplinServerSyncTarget, WebDAVSyncTarget, OneDriveSyncTarget)
    ↓ uses
FileApi (base class for filesystem operations)
    ↓ initialized by
Driver (e.g., FileApiJoplinServerDriver) + API (e.g., JoplinServerApi)
```

**Example**: `JoplinServerSyncTarget` uses `FileApi` which is initialized by `FileApiJoplinServerDriver` and `JoplinServerApi`.

### Key Directories

- **`src/SyncTarget/`** - Sync target implementations (`*SyncTarget.ts`). Each handles sync operations for a specific provider using FileApi.
- **`src/FileApi/`** - Base `FileApi` class + provider-specific APIs (`*Api.ts` like `JoplinServerApi.ts`, `WebDAVApi.ts`)
- **`src/FileApi/Driver/`** - Driver implementations (`*Driver.ts`) that glue provider APIs into FileApi interface
- **`src/Synchronizer/`** - Core sync logic, handles conflict resolution, delta operations
- **`src/StorageAPI/`** - High-level wrapper around Synchronizer for simple CRUD operations
- **`src/helpers/item/`** - Item builders and serialization helpers
- **`src/testing/`** - Test files; `test-utils.ts` controls which sync targets are tested

## Legacy Code Migration

**Important**: This codebase contains legacy `require()` statements being migrated to ES6 `import`.

### Common Legacy Patterns to Fix

```typescript
// ❌ OLD (legacy)
const shim = require("./shim").default;
const { basicDelta } = require("./file-api");
const { dirname, basename } = require("./path-utils");
const urlUtils = require("./urlUtils.js");

// ✅ NEW (correct)
import { singleton } from "../singleton"; // shim equivalent
import { basicDelta } from "../FileApi/FileApi";
import { dirname, basename, ltrimSlashes } from "@joplin/lib/path-utils";
import { helperMisc } from "../helpers/misc"; // for objectToQueryString
```

### Key Equivalents

- `shim` → `singleton` (from `src/singleton.ts`)
- `shim.fsDriver()` → `singleton.fsDriver()`
- `shim.fetch()` → `fetch()` (native)
- `shim.fetchBlob()` → `fetchBlob()` from `src/helpers/fetchBlob.ts`
- `shim.uploadBlob()` → `uploadBlob()` from `src/helpers/fetchBlob.ts`
- `urlUtils.objectToQueryString()` → `helperMisc.objectToQueryString()` from `src/helpers/misc.ts`
- `path-utils` → `@joplin/lib/path-utils` for `dirname`, `basename`, `ltrimSlashes`, `rtrimSlashes`

## Development Workflow

### Running Tests

```bash
npm test              # Run all tests (silent, sequential)
npm run test:verbose  # Run with full output
```

**To switch sync targets in tests**: Edit `src/testing/test-utils.ts` - this controls which providers (FileSystem, WebDAV, JoplinServer, etc.) are tested.

### Building

```bash
npm run build  # Compiles TypeScript
npm run dev    # Development mode with auto-restart
```

### Example Usage

See `src/bin/toy_storageAPI.ts` for how the library is intended to be used as an API.

## Code Conventions

### File Naming

- Sync targets: `*SyncTarget.ts` (e.g., `JoplinServerSyncTarget.ts`)
- APIs: `*Api.ts` (e.g., `OneDriveApi.ts`)
- Drivers: `FileApi*Driver.ts` (e.g., `FileApiOneDriveDriver.ts`)

### Module Exports

- Use ES6 `export` not `module.exports`
- Use named exports for utilities: `export { ClassName }`
- Use default exports for main classes: `export default ClassName`

### TypeScript Patterns

- Private fields use trailing underscore: `private api_: any`
- Protected FileApi reference in drivers: `protected fileApi_: FileApi`
- Base classes are typically abstract: `export abstract class BaseSyncTarget`

### Configuration Pattern

**No Settings Class**: This library does not use Joplin's `Setting` class. Instead:

- **Inject parameters via constructor options**: Pass configuration through the `options` parameter to sync target constructors
- **Use default values**: Fall back to sensible defaults or values from `parameters_` helper (in `src/helpers/parameter.ts`)
- **Store state in instance variables**: Auth tokens, context data, etc. are instance properties (e.g., `authToken_`, `context_`)
- **Access via option() helper**: Use `this.option('key', defaultValue)` from `BaseSyncTarget` to retrieve options

Example from OneDriveSyncTarget:

```typescript
public constructor(db: any, options: any = null) {
  super(db, options);
  // Options include: authToken, context, clientId, clientSecret, isPublic
  if (options?.authToken) this.authToken_ = options.authToken;
}

// Access via option() helper with defaults
const isPublic = this.option('isPublic', true);
const env = this.option('env', 'dev');
```

## Adding New Sync Targets

1. Create `*Api.ts` in `src/FileApi/` - handles provider-specific HTTP/API calls
2. Create `FileApi*Driver.ts` in `src/FileApi/Driver/` - implements FileApi interface using your API
3. Create `*SyncTarget.ts` in `src/SyncTarget/` - extends `BaseSyncTarget`, initializes FileApi with your driver
4. Add to `StorageAPI.ts` SYNC_TARGETS map and type union
5. Add initialization logic in `StorageAPI.init()` method

### OneDrive Example Structure

```typescript
// OneDriveApi handles OAuth, file operations
OneDriveApi.exec() → Microsoft Graph API calls

// FileApiDriverOneDrive adapts OneDrive to FileApi interface
FileApiDriverOneDrive.list() → calls api.execJson()

// OneDriveSyncTarget orchestrates sync
OneDriveSyncTarget.initFileApi() → new FileApi(baseDir, new FileApiDriverOneDrive(api))
```

## Testing Strategy

- **Unit tests**: `src/testing/*.test.ts`
- **Integration tests**: Focus on sync operations (upload, download, conflict resolution)
- **Resource handling**: See `src/testing/resource/` for binary file sync tests
- **E2E encryption**: `Synchronizer.e2ee.test.ts` tests encrypted sync flows

## Common Gotchas

1. **FileApi requires initialization**: Always call `await fileApi.initialize()` before use
2. **Paths are relative**: FileApi works with paths relative to baseDir, drivers handle fullPath via `fileApi.fullPath()`
3. **Delta operations**: Not all providers support native delta - use `basicDelta` fallback in `FileApi.ts`
4. **Type guards**: Check `if (item.isDir)` before operations - some sync targets return directories in listings
5. **Auth tokens**: Stored as strings but often need `JSON.parse()` - handle parse errors gracefully

## Documentation

- Architecture: `AGENTS.md` (this file's source)
- API docs: `sync-docs/` (Docusaurus site)
- Examples: `src/sample_app/` directory contains usage patterns
