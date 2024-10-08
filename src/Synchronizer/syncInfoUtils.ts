import Logger from "@joplin/utils/Logger";
import { FileApi } from "../FileApi/FileApi";
import JoplinDatabase from "@joplin/lib/JoplinDatabase";
import { compareVersions } from "compare-versions";
import JoplinError from "@joplin/lib/JoplinError";
import { ErrorCode } from "@joplin/lib/errors";
import { PublicPrivateKeyPair } from "@joplin/lib/services/e2ee/ppk";
import { MasterKeyEntity } from "@joplin/lib/services/e2ee/types";
const fastDeepEqual = require("fast-deep-equal");

const logger = Logger.create("syncInfoUtils");

export interface SyncInfoValueBoolean {
  value: boolean;
  updatedTime: number;
}

export interface SyncInfoValueString {
  value: string;
  updatedTime: number;
}

export interface SyncInfoValuePublicPrivateKeyPair {
  value: PublicPrivateKeyPair;
  updatedTime: number;
}

// This should be set to the client version whenever we require all the clients to be at the same
// version in order to synchronise. One example is when adding support for the trash feature - if an
// old client that doesn't know about this feature synchronises data with a new client, the notes
// will no longer be deleted on the old client.
//
// Usually this variable should be bumped whenever we add properties to a sync item.
//
// `appMinVersion_` should really just be a constant but for testing purposes it can be changed
// using `setAppMinVersion()`
let appMinVersion_ = "0.0.0";

export const setAppMinVersion = (v: string) => {
  appMinVersion_ = v;
};

export async function uploadSyncInfo(api: FileApi, syncInfo: SyncInfo) {
  await api.put("info.json", syncInfo.serialize());
}

export async function fetchSyncInfo(api: FileApi): Promise<SyncInfo> {
  const syncTargetInfoText = await api.get("info.json");

  // Returns version 0 if the sync target is empty
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  let output: any = { version: 0 };

  if (syncTargetInfoText) {
    output = JSON.parse(syncTargetInfoText);
    if (!output.version)
      throw new Error('Missing "version" field in info.json');
  } else {
    // If info.json is not present, this might be an old sync target, in
    // which case we can at least get the version number from version.txt
    const oldVersion = await api.get(".sync/version.txt");
    if (oldVersion) output = { version: 1 };
  }

  return fixSyncInfo(new SyncInfo(JSON.stringify(output)));
}

const fixSyncInfo = (syncInfo: SyncInfo) => {
  if (syncInfo.activeMasterKeyId) {
    if (
      !syncInfo.masterKeys ||
      !syncInfo.masterKeys.find((mk) => mk.id === syncInfo.activeMasterKeyId)
    ) {
      logger.warn(
        `Sync info is using a non-existent key as the active key - clearing it: ${syncInfo.activeMasterKeyId}`
      );
      syncInfo.activeMasterKeyId = "";
    }
  }
  return syncInfo;
};

export function syncInfoEquals(s1: SyncInfo, s2: SyncInfo): boolean {
  return fastDeepEqual(s1.toObject(), s2.toObject());
}

export class SyncInfo {
  private version_ = 0;
  private e2ee_: SyncInfoValueBoolean;
  private activeMasterKeyId_: SyncInfoValueString;
  private masterKeys_: MasterKeyEntity[] = [];
  private ppk_: SyncInfoValuePublicPrivateKeyPair;
  private appMinVersion_: string = appMinVersion_;

  public constructor(serialized: string = null) {
    this.e2ee_ = { value: false, updatedTime: 0 };
    this.activeMasterKeyId_ = { value: "", updatedTime: 0 };
    this.ppk_ = { value: null, updatedTime: 0 };

    if (serialized) this.load(serialized);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
  public toObject(): any {
    return {
      version: this.version,
      e2ee: this.e2ee_,
      activeMasterKeyId: this.activeMasterKeyId_,
      masterKeys: this.masterKeys,
      ppk: this.ppk_,
      appMinVersion: this.appMinVersion,
    };
  }

  public filterSyncInfo() {
    const filtered = JSON.parse(JSON.stringify(this.toObject()));

    // Filter content and checksum properties from master keys
    if (filtered.masterKeys) {
      filtered.masterKeys = filtered.masterKeys.map((mk: MasterKeyEntity) => {
        delete mk.content;
        delete mk.checksum;
        return mk;
      });
    }

    // Truncate the private key and public key
    if (filtered.ppk.value) {
      filtered.ppk.value.privateKey.ciphertext = `${filtered.ppk.value.privateKey.ciphertext.substr(
        0,
        20
      )}...${filtered.ppk.value.privateKey.ciphertext.substr(-20)}`;
      filtered.ppk.value.publicKey = `${filtered.ppk.value.publicKey.substr(
        0,
        40
      )}...`;
    }
    return filtered;
  }

  public serialize(): string {
    return JSON.stringify(this.toObject(), null, "\t");
  }

  public load(serialized: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const s: any = JSON.parse(serialized);
    this.version = "version" in s ? s.version : 0;
    this.e2ee_ = "e2ee" in s ? s.e2ee : { value: false, updatedTime: 0 };
    this.activeMasterKeyId_ =
      "activeMasterKeyId" in s
        ? s.activeMasterKeyId
        : { value: "", updatedTime: 0 };
    this.masterKeys_ = "masterKeys" in s ? s.masterKeys : [];
    this.ppk_ = "ppk" in s ? s.ppk : { value: null, updatedTime: 0 };
    this.appMinVersion_ = s.appMinVersion ? s.appMinVersion : "0.0.0";

    // Migration for master keys that didn't have "hasBeenUsed" property -
    // in that case we assume they've been used at least once.
    for (const mk of this.masterKeys_) {
      if (!("hasBeenUsed" in mk) || mk.hasBeenUsed === undefined) {
        mk.hasBeenUsed = true;
      }
    }
  }

  public setWithTimestamp(fromSyncInfo: SyncInfo, propName: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    if (!(propName in (this as any)))
      throw new Error(`Invalid prop name: ${propName}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    (this as any)[propName] = (fromSyncInfo as any)[propName];
    this.setKeyTimestamp(propName, fromSyncInfo.keyTimestamp(propName));
  }

  public get version(): number {
    return this.version_;
  }

  public set version(v: number) {
    if (v === this.version_) return;

    this.version_ = v;
  }

  public get ppk() {
    return this.ppk_.value;
  }

  public set ppk(v: PublicPrivateKeyPair) {
    if (v === this.ppk_.value) return;

    this.ppk_ = { value: v, updatedTime: Date.now() };
  }

  public get e2ee(): boolean {
    return this.e2ee_.value;
  }

  public set e2ee(v: boolean) {
    if (v === this.e2ee) return;

    this.e2ee_ = { value: v, updatedTime: Date.now() };
  }

  public get appMinVersion(): string {
    return this.appMinVersion_;
  }

  public set appMinVersion(v: string) {
    this.appMinVersion_ = v;
  }

  public get activeMasterKeyId(): string {
    return this.activeMasterKeyId_.value;
  }

  public set activeMasterKeyId(v: string) {
    if (v === this.activeMasterKeyId) return;

    this.activeMasterKeyId_ = { value: v, updatedTime: Date.now() };
  }

  public get masterKeys(): MasterKeyEntity[] {
    return this.masterKeys_;
  }

  public set masterKeys(v: MasterKeyEntity[]) {
    if (JSON.stringify(v) === JSON.stringify(this.masterKeys_)) return;

    this.masterKeys_ = v;
  }

  public keyTimestamp(name: string): number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    if (!(`${name}_` in (this as any)))
      throw new Error(`Invalid name: ${name}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    return (this as any)[`${name}_`].updatedTime;
  }

  public setKeyTimestamp(name: string, timestamp: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    if (!(`${name}_` in (this as any)))
      throw new Error(`Invalid name: ${name}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    (this as any)[`${name}_`].updatedTime = timestamp;
  }
} // ---------------------------------------------------------
// Shortcuts to simplify the refactoring
// ---------------------------------------------------------

export function masterKeyEnabled(mk: MasterKeyEntity): boolean {
  if ("enabled" in mk) return !!mk.enabled;
  return true;
}

export const checkIfCanSync = (s: SyncInfo, appVersion: string) => {
  if (compareVersions(appVersion, s.appMinVersion) < 0)
    throw new JoplinError(
      "In order to synchronise, please upgrade your application to version %s+",
      ErrorCode.MustUpgradeApp
    );
};
