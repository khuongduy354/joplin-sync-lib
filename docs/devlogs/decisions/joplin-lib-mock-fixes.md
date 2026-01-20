# joplin-lib-mock Fixes (commit 6961b5b)

This documents fixes required after migrating from @joplin/lib to joplin-lib-mock.

## Issues Fixed

### 1. Lock filename parsing (Locks.ts)
- Bug: `lockFileToObject()` used `filename(file.path)` which includes `.json` extension
- Result: clientId became `abc123.json` instead of `abc123`, causing lock ownership check to always fail
- Fix: `filename(file.path, false)` to exclude extension

### 2. BaseItem.itemClass() (BaseItem.ts) 
- Bug: Only accepted objects with `type_` property, not raw type numbers
- Fix: Added check `typeof item === 'number'`

### 3. BaseItem.pathToId() (BaseItem.ts)
- Bug: Returned filename with extension (e.g., `abc123.md`)
- Fix: Strip extension before returning

### 4. TaskQueue mock (TaskQueue.ts)
- Bug: `push()` returned Promise but callers didn't await it
- Bug: `waitForResult()` didn't wait for async task completion
- Fix: Store Promise and await it in `waitForResult()`

### 5. test-utils.ts MemorySyncTarget setup
- Bug: Each client created its own FileApiDriverMemory (isolated storage)
- Result: Locks weren't visible between clients
- Fix: Use `setFileApi()` to share FileApi between clients

## Testing
```bash
npm run test:no-conflict+e2e  # All tests pass
npm run build                  # Builds successfully
```
