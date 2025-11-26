# Testing  

```bash
npm run test
```

By default, tests run against `MemorySyncTarget` (in-memory filesystem). To test other sync targets, update the sync target ID in `src/testing/test-utils.ts` and configure the required environment variables.

## Testing Other Sync Targets

### Change Test Sync Target 

Edit `src/testing/test-utils.ts`:

```typescript
// Default (in-memory)
let currentSyncTargetId: number = MemorySyncTarget.id(); // ID: 5

// Change to other sync targets:
let currentSyncTargetId: number = JoplinServerSyncTarget.id(); // ID: 9
let currentSyncTargetId: number = OneDriveSyncTarget.id();     // ID: 3
let currentSyncTargetId: number = GoogleDriveSyncTarget.id();  // ID: 10
```

### Sync Target Configuration

Each sync target requires specific setup:
- MemorySyncTarget: no other configs needed beside above 
- WebDAVSyncTarget:  
use https://nextcloud.com/install/#aio to setup NextCloud


- JoplinServerSyncTarget:   
1. create a .env in root directory similar to joplinserver.example.env
2. run `docker run --env-file .env -p 22300:22300 joplin/server:latest` 
3. run `npm run test` in root directory 
4. run `docker stop <container_id_or_name>` (run `docker ps` to look for Joplin container id) to stop after done testing 

- OneDriveSyncTarget:
1. **Get OAuth credentials** - Create an app in [Azure Portal](https://portal.azure.com):
   - Go to "App registrations" → "New registration"
   - Name: "Joplin Sync Test" (or any name)
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Select "Public client/native (mobile & desktop)" and use `https://login.microsoftonline.com/common/oauth2/nativeclient`
   - After creation, note the **Application (client) ID**
   - Go to "Certificates & secrets" → "New client secret" → Note the **secret value**
   - Go to "API permissions" → "Add a permission" → "Microsoft Graph" → "Delegated permissions"
   - Add: `Files.ReadWrite.AppFolder`, `offline_access`, `Sites.ReadWrite.All`
   - Click "Grant admin consent"

2. **Get auth token** - Run the test OAuth flow script:
   ```bash
   export ONEDRIVE_CLIENT_ID="your-client-id"
   export ONEDRIVE_CLIENT_SECRET="your-client-secret"
   npx tsnd src/bin/test_oneDrive_flow.ts
   ```
   - Visit the displayed URL in your browser
   - Sign in and grant permissions
   - Copy the `code` parameter from the redirect URL
   - Paste it when prompted
   - The script will display your auth token

3. **Set environment variables** in `.env` file (see `.env.example`):
   ```bash
   ONEDRIVE_AUTH_TOKEN="your-auth-token-from-step-2"
   ONEDRIVE_CLIENT_ID="your-client-id"
   ONEDRIVE_CLIENT_SECRET="your-client-secret"
   ONEDRIVE_IS_PUBLIC="true"
   ```

4. **Update test sync target** in `src/testing/test-utils.ts`:
   ```typescript
   let currentSyncTargetId: number = OneDriveSyncTarget.id(); // ID: 3
   ```

5. **Run tests**:
   ```bash
   npm run test
   ```

**Note**: Auth tokens expire after ~1 hour. If tests fail with authentication errors, repeat step 2 to get a new token.

- GoogleDriveSyncTarget:
1. **Get OAuth credentials** - Create a project in [Google Cloud Console](https://console.cloud.google.com):
   - Go to "APIs & Services" → "Credentials"
   - Create a new project (if needed)
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Configure consent screen if prompted (External, add your email as test user)
   - Application type: "Desktop app"
   - Name: "Joplin Sync Test" (or any name)
   - Note the **Client ID** and **Client secret**
   - Go to "APIs & Services" → "Library"
   - Enable "Google Drive API"

2. **Get auth token** - Follow similar OAuth flow as OneDrive (create a test script similar to `test_oneDrive_flow.ts`)

3. **Set environment variables** in `.env` file:
   ```bash
   GOOGLEDRIVE_AUTH_TOKEN="your-auth-token"
   GOOGLEDRIVE_CLIENT_ID="your-client-id"
   GOOGLEDRIVE_CLIENT_SECRET="your-client-secret"
   GOOGLEDRIVE_IS_PUBLIC="true"
   ```

4. **Update test sync target** in `src/testing/test-utils.ts`:
   ```typescript
   let currentSyncTargetId: number = GoogleDriveSyncTarget.id(); // ID: 10
   ```

5. **Run tests**:
   ```bash
   npm run test
   ```

## Testing Tips

- **Token expiration**: Cloud provider auth tokens (OneDrive, GoogleDrive) typically expire after 1 hour. If tests fail with authentication errors, regenerate a new token using the OAuth flow scripts.
- **Clean test data**: Tests automatically clear the sync target root before and after running. For cloud providers, this means files in the app folder will be deleted.
- **Sequential testing**: Run tests sequentially, not in parallel, when using cloud sync targets to avoid rate limiting and conflicts.
- **Debug mode**: Set `DEBUG=true` environment variable for verbose logging during tests.
