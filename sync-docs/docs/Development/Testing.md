# Testing  

`npm run test`


# Testing other sync targets

### Change test sync target 
```js
// in src/testing/test-utils

let currentSyncTargetId: number = MemorySyncTarget.id();  

// change to other SyncTarget to test, for e.g:

let currentSyncTargetId: number = JoplinServerSyncTarget.id();  
```

### Additional Configs
- MemorySyncTarget: no other configs needed beside above 
- JoplinServerSyncTarget:   
1. create a .env in root directory similar to joplinserver.example.env
2. run `docker run --env-file .env -p 22300:22300 joplin/server:latest` 
3. run `npm run test` in root directory 
4. run `docker stop <container_id_or_name>` (run `docker ps` to look for Joplin container id) to stop after done testing 