# Joplin Sync Library    

Joplin Synchronization API documentation. 
 

# Usage 

# Run from source   
```js
git clone https://github.com/khuongduy354/joplin-sync-lib.git
npm install  

// Options to run: 
// 1. run in transpile mode (without build)
npm run dev   

// 2. build and run  
npm run build  
npm run start 

// src/index.ts is main driver code, 
// sync target is in src/sample_app/Storage/fsSyncTarget, check here for any changes 
``` 
see DEV.md for more explains  



# Documentations   

Beside this README.md, all other documentations is inside [sync-docs/docs](./sync-docs/docs) folder.    

### Build docs 

Documentations is built with Docusaurus 

```bash 
cd sync-docs/
npm run build 
npm run start
```

