# E2E integration flow for Sync API

## Setup E2E for Synchronizer  
 
- Synchronizer.e2eInfo stores encryption setup data, this decides whether CREATE, UPDATE methods will encrypt before upload.

```ts
type e2eInfo = {
  ppk?: PublicPrivateKeyPair; 
  e2ee: boolean; // encryption enable or not
  activeMasterKeyId?: string; 
};

type PublicPrivateKeyPair = {
  id: string;
  keySize: number;
  publicKey: string;
  privateKey: {
    encryptionMethod: EncryptionMethod; 
    ciphertext: string;
  };
  createdTime: number;
}
```    

- Users (clients) cant use Sync Library to enable/disable remote E2E because to do so, it requires proper re-encrypt and reupload data, this reduces data corruption. 
- To enable E2E, the process is as follow:   
1. Enable E2E in 1 Joplin app, provide password and all necessary data, click Synchronise and make sure Synchronisation succeeds, instruction:  [Joplin enabling e2ee](https://joplinapp.org/help/apps/sync/e2ee/#enabling-e2ee)  
2. In Sync library, fetch the remote sync info and extract all necessary E2E data:  

```ts  
const remoteSyncInfo = fetchSyncInfo(synchronizer.api());   
const localE2EInfo = extractE2EInfoFromSyncInfo(remoteSyncInfo) 
``` 

3. Run Synchronizer.setupE2E(localE2EInfo):  
```ts
const res: setupE2EOutput = synchronizer.setupE2E(localE2EInfo) 

type setupE2EOutput = {
  status: "succeeded" | "aborted";
  message: string; 
  remoteInfo?: SyncInfo; 
  e2eInfo?: e2eInfo; // returned when e2eInfo is set successfully  
}; 
```

4. If res.status is succeeded, then E2E is synced properly between client and remote. Most of the aborted cases are either users forgot to provide localE2EInfo (no E2E setup) or remote's e2e has changed since last time, the fix is to repeat from step 1 again. 

- To disable E2E, use 1 Joplin app to disable E2E, from step 2 and on, do the same as process above 
- When Synchronizer E2E is enabled, CREATE and UPDATE operations will encrypt items automatically for each call (no extra parameters required). 

## How E2E is applied if enabled
 - Only 2 Synchronizer operations: CREATE and UPDATE can apply encryption, which uses the ItemUploader class, it will take the E2E input from Synchronizer and perform encryption accordingly.
 - For READ methods, client may need extra code to decrypt content with master key, because results return from Sync API will be encrypted string.


## How setupE2E() checks and E2E mismatched scenarios

- The setup E2E guideline above is enough for usage, this is a specification for how e2e setup might be conflicted in remote and client, and how debug messages are constructed 

For this E2E flow, the cases are based on:
- https://joplinapp.org/help/apps/sync/e2ee/  
- https://joplinapp.org/help/dev/spec/e2ee/
To summarize there're 3 cases: 

(1) Enable E2E (enable E2E on 1 device and populate E2E setup automatically through Synchronization) Device 1 turn on E2E, sync to sync target. Device 2 pick up E2E setup on next sync.
(2) Disable E2E (disable E2E on every device manually): both devices in synced with E2E on, device 1 then disable E2E and sync 
(3) Changed E2E MasterKey: Assuming both devices have E2E enable properly and synced. Device 1 then change E2E key (change password) and sync.  

### remote enabled, local disabled
Our client is the Device 2 in case (1) above
 ![image|690x130](upload://AvUpQVNYv3AF29uX4vRmrKh6Tge.png)

### remote disabled, local enabled
 Our client is Device 2 in case (2)

### remote enabled, local enabled
 -> we further check if the ppk of remote and client matched 
    1. if matched, which means 2 devices are synced properly with E2E 
    2. if unmatched, our client is Device 2 in case (3)



