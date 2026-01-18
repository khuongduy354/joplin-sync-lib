export enum AppType {
  Desktop = "desktop",
  Mobile = "mobile",
  Cli = "cli",
}

export enum Env {
  Dev = "dev",
  Prod = "prod",
  Undefined = "undefined",
}

export enum SettingItemType {
  Int = 1,
  String = 2,
  Bool = 3,
  Array = 4,
  Object = 5,
  Button = 6,
}

export interface SettingItem {
  value: any;
  type: SettingItemType;
  public: boolean;
  label?: () => string;
  description?: () => string;
}

// Mock Setting class - minimal implementation
export default class Setting {
  private static cache_: Map<string, any> = new Map();
  public static constants_: Map<string, any> = new Map();

  public static value(key: string, defaultValue: any = null): any {
    if (this.cache_.has(key)) {
      return this.cache_.get(key);
    }
    return defaultValue;
  }

  public static setValue(key: string, value: any) {
    this.cache_.set(key, value);
  }

  public static setConstant(key: string, value: any) {
    this.cache_.set(key, value);
    this.constants_.set(key, value);
  }

  public static fieldNames(): string[] {
    return Array.from(this.cache_.keys());
  }
}

// Initialize some constants
Setting.constants_.set("appId", "Sync API");
Setting.constants_.set("appType", AppType.Desktop);
