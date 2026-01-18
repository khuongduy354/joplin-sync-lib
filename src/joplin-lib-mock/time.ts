// Simple time utilities mock
class Time {
  private dateFormat_ = "DD/MM/YYYY";
  private timeFormat_ = "HH:mm";
  private locale_ = "en-us";

  public locale() {
    return this.locale_;
  }

  public setLocale(v: string) {
    this.locale_ = v;
  }

  public dateFormat() {
    return this.dateFormat_;
  }

  public setDateFormat(v: string) {
    this.dateFormat_ = v;
  }

  public timeFormat() {
    return this.timeFormat_;
  }

  public setTimeFormat(v: string) {
    this.timeFormat_ = v;
  }

  public use24HourFormat() {
    return this.timeFormat() ? this.timeFormat().includes("HH") : true;
  }

  public dateTimeFormat() {
    return `${this.dateFormat()} ${this.timeFormat()}`;
  }

  public unix() {
    return Math.floor(Date.now() / 1000);
  }

  public unixMs() {
    return Date.now();
  }

  public unixMsToObject(ms: number) {
    return new Date(ms);
  }

  public unixMsToS(ms: number) {
    return Math.floor(ms / 1000);
  }

  public unixMsToIso(ms: number) {
    const date = new Date(ms);
    return date.toISOString();
  }

  public unixMsToIsoSec(ms: number) {
    const date = new Date(ms);
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  public formatMsToLocal(ms: number, format: string = null) {
    const date = new Date(ms);
    return date.toLocaleDateString();
  }

  public goBackInTime(startDate: any, n: number, period: string) {
    const date = new Date(startDate);
    if (period === "day") {
      date.setDate(date.getDate() - n);
    } else if (period === "week") {
      date.setDate(date.getDate() - n * 7);
    } else if (period === "month") {
      date.setMonth(date.getMonth() - n);
    } else if (period === "year") {
      date.setFullYear(date.getFullYear() - n);
    }
    return date.getTime();
  }

  public goForwardInTime(startDate: any, n: number, period: string) {
    const date = new Date(startDate);
    if (period === "day") {
      date.setDate(date.getDate() + n);
    } else if (period === "week") {
      date.setDate(date.getDate() + n * 7);
    } else if (period === "month") {
      date.setMonth(date.getMonth() + n);
    } else if (period === "year") {
      date.setFullYear(date.getFullYear() + n);
    }
    return date.getTime();
  }

  public async msleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, ms);
    });
  }

  public async sleep(seconds: number) {
    return this.msleep(seconds * 1000);
  }

  public unixMsToLocalHms(ms: number): string {
    const date = new Date(ms);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }
}

const time = new Time();
export default time;
