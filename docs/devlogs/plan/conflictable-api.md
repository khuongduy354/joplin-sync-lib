
delta algorithm is for detecting changes only

0. FORCE update 
Write whatever, however 


1. Conflict detection
To ensure that I can write without conflict: 
local_item.last_sync_time == remote_item.last_sync_time
-> Because there're no way that 2 items from 2 clients can be synced at the same time and have same sync_time 

local_item.last_sync_time < remote_item.last_sync_time: NEED PULLS -> NOT ALLOW UPLOAD -> PULL and process CONFLICT
local_item.last_sync_time > remote_item.last_sync_time: almost impossible
local_item.last_sync_time == remote_item.last_sync_time: YES -> ALLOW UPLOAD 

# Questions 

- Does the last_sync_time aware of the SYNC target 
-> I think yes because it tracked in sqlite -> need confirmation








