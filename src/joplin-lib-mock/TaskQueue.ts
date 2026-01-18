// Mock TaskQueue class
export default class TaskQueue {
  private concurrency_: number;
  private name_: string;
  private queue_: any[] = [];

  public constructor(nameOrConcurrency: string | number = 1) {
    if (typeof nameOrConcurrency === "string") {
      this.name_ = nameOrConcurrency;
      this.concurrency_ = 1;
    } else {
      this.concurrency_ = nameOrConcurrency;
    }
  }

  public async push(id: string, callback: () => Promise<any>): Promise<any> {
    return callback();
  }

  public async waitForAll(): Promise<void> {
    // Mock wait for all
  }

  public concurrency(): number {
    return this.concurrency_;
  }
}
