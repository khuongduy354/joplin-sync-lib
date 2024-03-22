# Joplin Sync

Standalone library for Joplin synchronization.

# Now

- OneDrive API (auth, basic endpoints) DONE  
  => testing needed
- implement SQLite API done
- fix singleton done
- implement onedrive -> file api DONE
- implement basesynctarget (synchronizer vs file api) DONE
- implement onedrivesynctarget

- implement Synchronizer.start()
- launch driver app, such that if db1 is sync to OneDrive and sync to db2 === success

- write proposal, judging previous (need to remove components), asking what want different, and specific layout

# Design

Sync with OneDrive first

- notes, folder interface
- connect OneDrive: Auth interface
- Sync interface implement OneDrive API interface
- upload files read from above to OneDrive

- connect OneDrive
- Need a Revision interface to check for sync for each file \*\*
- If needed, sync OneDrive
- Diff interface to check for conflicts \*
- Conflicts: files from remote conflict from local moved to Separate and not sync

* && \*\*: how revision should work? How diff works, same line add more consider diff?
  revision: sync = update revision, edit = update revision, revision depend on 1 file

5 interfaces: FileApi, SyncTarget, Synchrnozier, ProviderApi

, Revision, Diff

# Question (target this first)

- How joplin do revision, know which is synced (sync -> pause sync -> sync)  
  -> delta sync look into this  
  this is how data is tracked {"user_data":"","icon":"","master_key_id":"","is_shared":0,"encryption_cipher_text":"","user_updated_time":1709750683220,"user_created_time":1709750679287,"created_time":1709750679287,"title":"a"}
