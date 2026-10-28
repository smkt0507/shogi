export class EngineBusyError extends Error {}

// Limit actual child processes, including requests from different browser tabs.
export class EnginePool {
  private active = 0;
  private waiting: (() => void)[] = [];
  constructor(
    private readonly limit = 2,
    private readonly maxWaiting = 16,
    private readonly waitMs = 20000,
  ) {}

  async run<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T> {
    const release = await this.acquire(signal);
    try {
      signal.throwIfAborted();
      return await task();
    } finally {
      release();
    }
  }

  private acquire(signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted();
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve(this.release);
    }
    if (this.waiting.length >= this.maxWaiting)
      return Promise.reject(new EngineBusyError("engine queue full"));
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        this.waiting = this.waiting.filter((entry) => entry !== start);
      };
      const start = () => {
        cleanup();
        resolve(this.release);
      };
      const onAbort = () => {
        cleanup();
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new EngineBusyError("engine queue timeout"));
      }, this.waitMs);
      signal.addEventListener("abort", onAbort, { once: true });
      this.waiting.push(start);
    });
  }

  private release = () => {
    const next = this.waiting.shift();
    if (next) next();
    else this.active -= 1;
  };
}
