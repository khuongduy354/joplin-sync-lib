# Joplin Sync Library   
 

# Usage
```javascript
import { initDb } from "../Database/Database";
import SyncTargetOneDrive from "../SyncTarget/OneDriveSyncTarget";

function main() { 
  // path to sqlite database file 
  const path = "/sample_app/Storage/database1";
  // onedrive auth token 
  const token = "some token here";

  const db = initDb(path);
  const syncTarget = new SyncTargetOneDrive(db);
  syncTarget.authenticate(token); 
  syncTarget.initFileApi(); 
  syncTarget.initSynchronizer();      
  syncTarget.synchronizer().then(syncer => syncer.start()); 
}
``` 

# Run from source  
```js
npm run dev  // use ts-node-dev to run
```


