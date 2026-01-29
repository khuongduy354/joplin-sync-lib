# Implementation  


Browser-based 
- Master key/Data key generation ?  
- Encrypt/Decrypt in browser?  


1. The Core Setup (Web Crypto)

Joplin transitioned to AES-GCM (256-bit) for its "Native Encryption" (KeyV1). This is perfect for the browser because window.crypto.subtle supports GCM natively, providing high-speed, authenticated encryption.
Recommended Joplin-Compatible Spec:

    Key Derivation (KDF): PBKDF2 (SHA-256).

    Encryption Algorithm: AES-GCM.

    Key Size: 256-bit.

    IV (Nonce): 12 bytes (96-bit).

    Auth Tag: 128-bit.

2. Updated Flow for Online-First

Since you don't store a local DB, your memory management is key. You'll want to keep the Master Key in a non-exportable state in the browser's RAM during the session.
The "Upload" Pipeline (Memory-to-Cloud)

    Password Entry: User types password.

    Derivation: Browser derives a temporary Master Key (KEK) using PBKDF2.

    Fetch/Create Data Key: * If first time: Generate a random Data Key, encrypt it with the Master Key, and upload to cloud (info.json style).

        If returning: Download the encrypted Data Key and decrypt it.

    Streaming Encryption: As the user saves a note, the browser encrypts it with the Data Key and POSTs it directly to your storage.


# Flow 
# E2E standard 

User type in Master Password 


When upload: 
- Master key encrypt Items 
- Master password encrypt Master key  
-> Both encrypted Items and encrypted Master key are uploaded to cloud storage 

When download: 
- Download encrypted Items and encrypted Master key 
- Master password decrypt Master key 
- Master key decrypt Items 


# E2E for sharing 

User setup PPK 

When sharing: 
- A data key is generated for each notebook 
- Data key is encrypted with recipient's public key 
- Encrypted data key and Encrypted Items are uploaded to cloud storage 

When download (specific recipient only): 
- Download encrypted Items and encrypted data key 
- Recipient's private key decrypt data key 
- Data key decrypt Items 