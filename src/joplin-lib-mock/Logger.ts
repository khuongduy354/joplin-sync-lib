// Simple Logger implementation
export enum LogLevel {
  None = 0,
  Error = 10,
  Warn = 20,
  Info = 30,
  Debug = 40,
}

class Logger {
  private static globalLevel: LogLevel = LogLevel.Info;
  private prefix: string;

  constructor(prefix: string = "") {
    this.prefix = prefix;
  }

  public static create(prefix: string): Logger {
    return new Logger(prefix);
  }

  public static setLevel(level: LogLevel) {
    this.globalLevel = level;
  }

  private formatMessage(...args: any[]): any[] {
    if (this.prefix) {
      return [`[${this.prefix}]`, ...args];
    }
    return args;
  }

  public error(...args: any[]) {
    if (Logger.globalLevel >= LogLevel.Error) {
      console.error("[ERROR]", ...this.formatMessage(...args));
    }
  }

  public warn(...args: any[]) {
    if (Logger.globalLevel >= LogLevel.Warn) {
      console.warn("[WARN]", ...this.formatMessage(...args));
    }
  }

  public info(...args: any[]) {
    if (Logger.globalLevel >= LogLevel.Info) {
      console.info("[INFO]", ...this.formatMessage(...args));
    }
  }

  public debug(...args: any[]) {
    if (Logger.globalLevel >= LogLevel.Debug) {
      console.debug("[DEBUG]", ...this.formatMessage(...args));
    }
  }

  // Static methods for when Logger is used without create()
  public static error(...args: any[]) {
    if (this.globalLevel >= LogLevel.Error) {
      console.error("[ERROR]", ...args);
    }
  }

  public static warn(...args: any[]) {
    if (this.globalLevel >= LogLevel.Warn) {
      console.warn("[WARN]", ...args);
    }
  }

  public static info(...args: any[]) {
    if (this.globalLevel >= LogLevel.Info) {
      console.info("[INFO]", ...args);
    }
  }

  public static debug(...args: any[]) {
    if (this.globalLevel >= LogLevel.Debug) {
      console.debug("[DEBUG]", ...args);
    }
  }
}

export default Logger;
