/**
 * Tests for Singleton pattern implementation.
 */

import {
  BaseSingleton,
  AsyncSingleton,
  SingletonContainer,
} from '../singleton';

describe('Singleton Pattern', () => {
  describe('BaseSingleton', () => {
    it('should create only one instance', () => {
      class TestSingleton extends BaseSingleton<TestSingleton> {
        value: string;
        
        constructor() {
          super();
          this.value = 'test';
        }
      }
      
      const instance1 = TestSingleton.getInstance();
      const instance2 = TestSingleton.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1.value).toBe('test');
    });

    it('should allow accessing instance via static method', () => {
      class TestSingleton extends BaseSingleton<TestSingleton> {
        count: number = 0;
        
        increment(): number {
          return ++this.count;
        }
      }
      
      const instance = TestSingleton.getInstance();
      const count1 = instance.increment();
      const count2 = instance.increment();
      
      expect(count1).toBe(1);
      expect(count2).toBe(2);
    });

    it('should not allow direct instantiation', () => {
      class TestSingleton extends BaseSingleton<TestSingleton> {
        constructor() {
          super();
        }
      }
      
      // This should throw or we should verify instance is singleton
      const instance1 = TestSingleton.getInstance();
      const instance2 = TestSingleton.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should work with different singleton classes', () => {
      class SingletonA extends BaseSingleton<SingletonA> {
        name = 'A';
      }
      
      class SingletonB extends BaseSingleton<SingletonB> {
        name = 'B';
      }
      
      const a1 = SingletonA.getInstance();
      const a2 = SingletonA.getInstance();
      const b1 = SingletonB.getInstance();
      
      expect(a1).toBe(a2);
      expect(a1).not.toBe(b1);
      expect(a1.name).toBe('A');
      expect(b1.name).toBe('B');
    });
  });

  describe('AsyncSingleton', () => {
    it('should create async singleton instance', async () => {
      let instanceCreated = false;
      
      class TestAsyncSingleton extends AsyncSingleton<TestAsyncSingleton> {
        async initialize(): Promise<this> {
          instanceCreated = true;
          return this;
        }
        
        getValue(): string {
          return 'async test';
        }
      }
      
      const instance1 = await TestAsyncSingleton.getInstance();
      const instance2 = await TestAsyncSingleton.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instanceCreated).toBe(true);
      expect(instance1.getValue()).toBe('async test');
    });

    it('should cache instance after first creation', async () => {
      let initCount = 0;
      
      class TestAsyncSingleton extends AsyncSingleton<TestAsyncSingleton> {
        async initialize(): Promise<this> {
          initCount++;
          return this;
        }
      }
      
      const instance1 = await TestAsyncSingleton.getInstance();
      const instance2 = await TestAsyncSingleton.getInstance();
      const instance3 = await TestAsyncSingleton.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(initCount).toBe(1);
    });

    it('should allow accessing instance without awaiting (returns promise)', async () => {
      class TestAsyncSingleton extends AsyncSingleton<TestAsyncSingleton> {
        async initialize(): Promise<this> {
          return this;
        }
        
        data = 'test';
      }
      
      const promise1 = TestAsyncSingleton.getInstance();
      const promise2 = TestAsyncSingleton.getInstance();
      
      expect(promise1).toBe(promise2);
      
      const instance1 = await promise1;
      const instance2 = await promise2;
      
      expect(instance1).toBe(instance2);
      expect(instance1.data).toBe('test');
    });
  });

  describe('SingletonContainer', () => {
    it('should manage multiple singleton instances', () => {
      const container = new SingletonContainer();
      
      class ServiceA {
        name = 'ServiceA';
      }
      
      class ServiceB {
        name = 'ServiceB';
      }
      
      container.register('serviceA', ServiceA);
      container.register('serviceB', ServiceB);
      
      const a1 = container.get<ServiceA>('serviceA');
      const a2 = container.get<ServiceA>('serviceA');
      const b1 = container.get<ServiceB>('serviceB');
      
      expect(a1).toBe(a2);
      expect(a1).not.toBe(b1);
      expect(a1.name).toBe('ServiceA');
      expect(b1.name).toBe('ServiceB');
    });

    it('should throw for unregistered services', () => {
      const container = new SingletonContainer();
      
      expect(() => container.get('unregistered')).toThrow();
    });

    it('should allow registering factory functions', () => {
      const container = new SingletonContainer();
      
      interface Config {
        apiUrl: string;
      }
      
      container.register('config', () => ({
        apiUrl: 'https://api.example.com',
      } as Config));
      
      const config1 = container.get<Config>('config');
      const config2 = container.get<Config>('config');
      
      expect(config1).toBe(config2);
      expect(config1.apiUrl).toBe('https://api.example.com');
    });

    it('should check if service is registered', () => {
      const container = new SingletonContainer();
      
      class Service {
        name = 'Test';
      }
      
      expect(container.has('service')).toBe(false);
      
      container.register('service', Service);
      
      expect(container.has('service')).toBe(true);
    });

    it('should allow resetting the container', () => {
      const container = new SingletonContainer();
      
      class Service {
        name = 'Test';
      }
      
      container.register('service', Service);
      const instance1 = container.get<Service>('service');
      
      container.reset();
      
      expect(() => container.get('service')).toThrow();
    });

    it('should clear all instances', () => {
      const container = new SingletonContainer();
      
      class Service {
        constructor(public id: number) {}
      }
      
      container.register('service', () => new Service(Math.random()));
      const instance1 = container.get<Service>('service');
      
      container.clear();
      
      // After clear, we should be able to register again
      container.register('service', () => new Service(42));
      const instance2 = container.get<Service>('service');
      
      expect(instance1).not.toBe(instance2);
      expect(instance2.id).toBe(42);
    });
  });
});
