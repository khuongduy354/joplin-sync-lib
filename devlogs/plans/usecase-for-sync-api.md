1. Upgrade the react-native-for-web + sqlite-wasm by either: 
  1. Replace entirely sync lib 
  2. Replace ONLY the changes    
-> too complex, requires CHANGES API 

2. Joplin as a headless blog 
  May need something to MARK the thing as PUBLISHED   
  -> Generate Hugo/Jekyll Markdown files 
  -> On github action
  -> Deploy  

  it works without the need of desktop 

3. Email to Note 
-> github action
  Write only, only need the PARENT ID initially 
  


<!-- 4. Push notification  *************** THIS IS THE CRAZIEST -->
<!-- in mobile/desktop  -->
<!-- -> emit changes when remote changes  -->
<!-- -> Event crazier REMINDER on mobile phone -->
<!--  -->
<!--  -->
<!-- Convince joplin to host a push server in joplin cloud  -->
<!-- Provide a self host server solution  -->
<!-- Serverless means foreground only or polling (delayed notification) -->
<!-- -> Focus on what matter: CHANGES API + Push notification + Push server  -->
<!--  -->
<!-- 1. Push Notification (Server-Required) -->
<!-- Requires: A central "Push Server" (yours) + Apple/Google Push Service. -->
<!-- Process: -->
<!-- Change happens on OneDrive. -->
<!-- OneDrive (via Webhook) tells Your Server. -->
<!-- Your Server sends a push to Apple/Google. -->
<!-- Apple/Google sends a packet to the phone. -->
<!-- Phone wakes up instantly. -->
<!-- Your Case: You don't have a "Push Server". You can't do this easily. -->
<!-- 2. Background Fetch (Serverless / "Delayed Notification") -> YOUR BEST OPTION -->
<!-- Requires: Just your app code on the phone. No external server. -->
<!-- Process: -->
<!-- You register a "Background Task" in iOS/Android (e.g., "Check sync every 15 mins"). -->
<!-- The OS (iOS/Android) intelligently decides when to wake up your app (based on battery, usage patterns, WiFi). -->
<!-- App wakes up in the background for ~30 seconds. -->
<!-- Your Library runs: It checks OneDrive for changes (using a quick API call like "Get Changes Since Token X"). -->
<!-- If changes found: It downloads the new notes and shows a Local Notification ("3 new notes synced"). -->
<!-- App goes back to sleep. -->
<!-- Why this fits your library: -->
<!--  -->
<!-- It is genuinely Client-Side Only. -->
<!-- It uses Local Notifications, not Push Notifications. -->
<!-- It respects battery life. -->
<!-- The "delay" (15-60 mins) is acceptable for a note app sync (unlike a chat app). -->




<!-- 5. Discord chat with Joplin -->
<!-- -> hosting is ineffective -->



6. Server Code runner  
maybe not needed

-----
1000. Some AI in server that runs at X time ?? I don't know 
