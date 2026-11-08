/**
 * Observer pattern implementation for event-driven architecture.
 */

/**
 * Observer interface for receiving notifications.
 */
export interface Observer<T = unknown> {
  update(data: T): void | Promise<void>;
  name?: string;
}

/**
 * Subject (Observable) class that maintains a list of observers and notifies them.
 */
export class Subject<T = unknown> {
  private observers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): () => void {
    this.observers.add(observer);
    return () => this.unsubscribe(observer);
  }

  unsubscribe(observer: Observer<T>): void {
    this.observers.delete(observer);
  }

  notify(data: T): void {
    this.observers.forEach((observer) => {
      try {
        const result = observer.update(data);
        if (result && typeof result.then === 'function') {
          result.catch((error) => {
            console.error(`Observer ${observer.name || 'unnamed'} error:`, error);
          });
        }
      } catch (error) {
        console.error(`Observer ${observer.name || 'unnamed'} error:`, error);
      }
    });
  }

  async notifyAsync(data: T): Promise<void> {
    const promises: Promise<unknown>[] = [];

    this.observers.forEach((observer) => {
      try {
        const result = observer.update(data);
        if (result && typeof result.then === 'function') {
          promises.push(
            result.catch((error) => {
              console.error(`Observer ${observer.name || 'unnamed'} error:`, error);
            }),
          );
        }
      } catch (error) {
        console.error(`Observer ${observer.name || 'unnamed'} error:`, error);
      }
    });

    await Promise.all(promises);
  }

  clear(): void {
    this.observers.clear();
  }

  get size(): number {
    return this.observers.size;
  }
}

/**
 * Event emitter implementation using observer pattern.
 */
export class EventEmitter<T extends Record<string, unknown> = Record<string, unknown>> {
  private subjects: Map<keyof T, Subject<T[keyof T]>> = new Map();

  on<K extends keyof T>(event: K, observer: Observer<T[K]>): () => void {
    if (!this.subjects.has(event)) {
      this.subjects.set(event, new Subject<T[K]>());
    }
    const subject = this.subjects.get(event)!;
    return subject.subscribe(observer);
  }

  off<K extends keyof T>(event: K, observer: Observer<T[K]>): void {
    const subject = this.subjects.get(event);
    if (subject) {
      subject.unsubscribe(observer);
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const subject = this.subjects.get(event);
    if (subject) {
      subject.notify(data);
    }
  }

  async emitAsync<K extends keyof T>(event: K, data: T[K]): Promise<void> {
    const subject = this.subjects.get(event);
    if (subject) {
      await subject.notifyAsync(data);
    }
  }

  once<K extends keyof T>(event: K, observer: Observer<T[K]>): () => void {
    const onceObserver: Observer<T[K]> = {
      update: (data) => {
        observer.update(data);
        this.off(event, onceObserver);
      },
      name: observer.name,
    };
    return this.on(event, onceObserver);
  }

  clear(): void {
    this.subjects.forEach((subject) => subject.clear());
    this.subjects.clear();
  }
}

/**
 * Base observer class that can be extended.
 */
export abstract class BaseObserver<T = unknown> implements Observer<T> {
  abstract name: string;

  abstract update(data: T): void | Promise<void>;
}

/**
 * Callback observer that wraps a function.
 */
export class CallbackObserver<T = unknown> implements Observer<T> {
  private callback: (data: T) => void | Promise<void>;

  constructor(callback: (data: T) => void | Promise<void>, public name?: string) {
    this.callback = callback;
  }

  update(data: T): void | Promise<void> {
    return this.callback(data);
  }
}

/**
 * Debounced observer that limits how often it fires.
 */
export class DebouncedObserver<T = unknown> implements Observer<T> {
  private observer: Observer<T>;
  private delay: number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(observer: Observer<T>, delay: number = 300) {
    this.observer = observer;
    this.delay = delay;
  }

  update(data: T): void | Promise<void> {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      return this.observer.update(data);
    }, this.delay);
  }

  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
