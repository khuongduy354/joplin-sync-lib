import JoplinError from "@joplin/lib/JoplinError";
import BaseItem from "@joplin/lib/models/BaseItem";
import itemCanBeEncrypted from "@joplin/lib/models/utils/itemCanBeEncrypted";
import {
  BaseItemEntity,
  ResourceEntity,
} from "@joplin/lib/services/database/types";
import EncryptionService from "@joplin/lib/services/e2ee/EncryptionService";
import { MasterKeyEntity } from "@joplin/lib/services/e2ee/types";

// UNIMPLEMENTED
// TODO: not for user to toggle on/off, but as an indication of whether encryption is enabled when interacting with remote
// use along with LocalInfo to store state of running instance
// let e2eEnabled = false;
let masterKeyId = null;
export async function setupAndEnableEncryption(
  service: EncryptionService,
  masterKey: MasterKeyEntity = null,
  masterPassword: string = null
) {
  if (!masterKey) {
    // May happen for example if there are master keys in info.json but none
    // of them is set as active. But in fact, unless there is a bug in the
    // application, this shouldn't happen.
    console.warn(
      "Setting up E2EE without a master key - user will need to either generate one or select one of the existing ones as active"
    );
  }

  e2eEnabled = true;
  masterKeyId = masterKey ? masterKey.id : null;

  // setEncryptionEnabled(true, masterKey ? masterKey.id : null);

  if (masterPassword) {
    // Setting.setValue("encryption.masterPassword", masterPassword);
  }

  // Mark only the non-encrypted ones for sync since, if there are encrypted ones,
  // it means they come from the sync target and are already encrypted over there.
  await BaseItem.markAllNonEncryptedForSync();

  // await loadMasterKeysFromSettings(service);
}

export async function setupAndDisableEncryption(service: EncryptionService) {
  // Allow disabling encryption even if some items are still encrypted, because whether E2EE is enabled or disabled
  // should not affect whether items will eventually be decrypted or not (DecryptionWorker will still work as
  // long as there are encrypted items). Also even if decryption is disabled, it's possible that encrypted items
  // will still be received via synchronisation.

  e2eEnabled = false;
  masterKeyId = null;

  // The only way to make sure everything gets decrypted on the sync target is
  // to re-sync everything.
  // await BaseItem.forceSyncAll();

  // await loadMasterKeysFromSettings(service);
}

export async function serializeForSync(
  item: BaseItemEntity,
  e2eEnabled: boolean
): Promise<string> {
  const ItemClass = BaseItem.itemClass(item);
  const shownKeys = ItemClass.fieldNames();
  shownKeys.push("type_");

  //TODO: share service
  //   const share = item.share_id
  //     ? await this.shareService().shareById(item.share_id)
  //     : null;
  const serialized = await ItemClass.serialize(item, shownKeys);

  if (!e2eEnabled || !ItemClass.encryptionSupported()) {
    // Normally not possible since itemsThatNeedSync should only return decrypted items

    // TODO: bug here, encryption_applied === 0, but condition below returns true
    //   if (!!item.encryption_applied)
    //     throw new JoplinError(
    //       `Item is encrypted but encryption is currently disabled: ${JSON.stringify(
    //         item
    //       )}`,
    //       "cannotSyncEncrypted"
    //     );
    return serialized;
  }

  if (item.encryption_applied) {
    const e: any = new Error(
      "Trying to encrypt item that is already encrypted"
    );
    e.code = "cannotEncryptEncrypted";
    throw e;
  }

  let cipherText = null;

  try {
    const e2eService = new EncryptionService();
    cipherText = await e2eService.encryptString(serialized, {
      //   masterKeyId: share && share.master_key_id ? share.master_key_id : "",
      masterKeyId: "",
    });
  } catch (error) {
    const msg = [`Could not encrypt item ${item.id}`];
    if (error && error.message) msg.push(error.message);
    const newError = new Error(msg.join(": "));
    newError.stack = error.stack;
    throw newError;
  }

  // List of keys that won't be encrypted - mostly foreign keys required to link items
  // with each others and timestamp required for synchronisation.
  const keepKeys = [
    "id",
    "note_id",
    "tag_id",
    "parent_id",
    "share_id",
    "updated_time",
    "type_",
  ];
  const reducedItem: any = {};

  for (let i = 0; i < keepKeys.length; i++) {
    const n = keepKeys[i];
    if (!item.hasOwnProperty(n)) continue;
    reducedItem[n] = (item as any)[n];
  }

  reducedItem.encryption_applied = 1;
  reducedItem.encryption_cipher_text = cipherText;
  return ItemClass.serialize(reducedItem);
}

export const makeEncryptedResourceFilename = (filename: string) => {
  let extension = "crypted";
  return filename + "." + extension;
};
export const makeEncryptedResourcePath = (plainTextPath: string) => {
  let plainTextPathArr = plainTextPath.split("/");
  const filename = plainTextPathArr.pop();
  if (!filename) throw new Error("Invalid path");

  plainTextPathArr.push(makeEncryptedResourceFilename(filename));
  return plainTextPathArr.join("/");
};
// Prepare the resource by encrypting it if needed.
// The call returns the path to the physical file AND a representation of the resource object
// as it should be uploaded to the sync target. Note that this may be different from what is stored
// in the database. In particular, the flag encryption_blob_encrypted might be 1 on the sync target
// if the resource is encrypted, but will be 0 locally because the device has the decrypted resource.
export async function fullPathForSyncUpload(
  resource: BaseItem,
  e2eEnabled: boolean
) {
  const plainTextPath = resource.localResourceContentPath;
  if (!plainTextPath)
    throw new Error("Resource does not specified a local path");

  if (!e2eEnabled) {
    if (resource.encryption_blob_encrypted)
      throw new Error(
        "Trying to access encrypted resource but encryption is currently disabled"
      );
    return { path: plainTextPath, resource: resource };
  }

  const encryptedPath = makeEncryptedResourcePath(plainTextPath);
  if (resource.encryption_blob_encrypted)
    return { path: encryptedPath, resource: resource };

  try {
    const e2eService = new EncryptionService();
    await e2eService.encryptFile(plainTextPath, encryptedPath, {
      // masterKeyId: share && share.master_key_id ? share.master_key_id : "",
      masterKeyId: "",
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new JoplinError(
        `Trying to encrypt resource but only metadata is present: ${error.toString()}`,
        "fileNotFound"
      );
    }
    throw error;
  }

  const resourceCopy = { ...resource };
  resourceCopy.encryption_blob_encrypted = 1;
  return { path: encryptedPath, resource: resourceCopy };
}
