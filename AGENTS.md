# Architecture 

### Notes 
`src/singleton.ts` is shim equivalent 
Some files contains old requires (due to old legacy code), should use import instead

See `src/bin/toy_storageAPI.ts` for how the project is used 


### Files   
in `src/testing` contains testing files 
in `src/testing/test-utils` contains main testing driver (which environments/platform is tested when I run `npm run test`), for example I can switch from sync target A to sync target B by editing these files. 

in `src/SyncTarget` *SyncTarget: Use FileApi and various steps to perform sync operations 


in `src/FileApi` FileAPI: base class allow operations on selected filesystem

in `src/FileAPI` *API: this should match the corresponding provider

in `src/FileApi/Driver` *Driver: Glue API into file API 


Example:  

JoplinServerSyncTarget 
use 
JoplinServerFileAPI 
which inherits FileApi 
and is initialized by FileApiJoplinServerDriver and JoplinServerApi 

