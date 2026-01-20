// Mock TaskQueue class
export default class TaskQueue {
  private concurrency_: number;
  private name_: string;
  private queue_: any[] = [];
  private results_: Map<
    string,
    { result: any; error: any; promise: Promise<any> }
  > = new Map();
  private running_: boolean = true;
  public logger_: any;

  public constructor(nameOrConcurrency: string | number = 1) {
    if (typeof nameOrConcurrency === "string") {
      this.name_ = nameOrConcurrency;
      this.concurrency_ = 1;
    } else {
      this.concurrency_ = nameOrConcurrency;
    }
  }

  public push(id: string, callback: () => Promise<any>): void {
    // Start the task immediately but don't block
    const promise = (async () => {
      try {
        const result = await callback();
        const entry = this.results_.get(id);
        if (entry) {
          entry.result = result;
        }
        return result;
      } catch (error) {
        const entry = this.results_.get(id);
        if (entry) {
          entry.error = error;
        }
        throw error;
      }
    })();

    this.results_.set(id, { result: null, error: null, promise });
  }

  public async waitForResult(id: string): Promise<{ result: any; error: any }> {
    const entry = this.results_.get(id);
    if (!entry) {
      return { result: null, error: null };
    }
    // Wait for the task to complete
    try {
      await entry.promise;
    } catch (e) {
      // Error is already captured in entry.error
    }
    return { result: entry.result, error: entry.error };
  }

  public async waitForAll(): Promise<void> {
    const promises = Array.from(this.results_.values()).map((e) => e.promise);
    await Promise.allSettled(promises);
  }

  public stop(): void {
    this.running_ = false;
    this.results_.clear();
  }

  public concurrency(): number {
    return this.concurrency_;
  }
}
