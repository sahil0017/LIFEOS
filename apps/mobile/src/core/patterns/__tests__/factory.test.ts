/**
 * Tests for Factory pattern implementation.
 */

import {
  SingletonFactory,
  ObjectFactory,
  HeadersFactory,
  createFactory,
} from '../factory';

describe('Factory Pattern', () => {
  describe('SingletonFactory', () => {
    it('should create singleton instances', () => {
      const factory = new SingletonFactory<{ id: string }>(() => ({ id: 'test' }));
      
      const instance1 = factory.getInstance();
      const instance2 = factory.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe('test');
    });

    it('should allow custom creation function', () => {
      let counter = 0;
      const factory = new SingletonFactory<{ count: number }>(() => {
        counter++;
        return { count: counter };
      });
      
      const instance1 = factory.getInstance();
      const instance2 = factory.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1.count).toBe(1);
      expect(counter).toBe(1);
    });

    it('should allow reset', () => {
      const factory = new SingletonFactory<{ id: string }>(() => ({ id: 'test' }));
      
      const instance1 = factory.getInstance();
      factory.reset();
      const instance2 = factory.getInstance();
      
      expect(instance1).not.toBe(instance2);
      expect(instance2.id).toBe('test');
    });
  });

  describe('ObjectFactory', () => {
    it('should create objects with provided properties', () => {
      const factory = new ObjectFactory();
      
      const obj = factory.create({ id: 1, name: 'test' });
      
      expect(obj).toEqual({ id: 1, name: 'test' });
    });

    it('should allow type-safe creation', () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }
      
      const factory = new ObjectFactory<User>();
      const user = factory.create({
        id: 1,
        name: 'John',
        email: 'john@example.com',
      });
      
      expect(user.name).toBe('John');
      expect(user.email).toBe('john@example.com');
    });

    it('should merge partial objects', () => {
      const factory = new ObjectFactory<{ a: number; b: string; c?: boolean }>();
      
      const base = { a: 1, b: 'test' };
      const partial = { b: 'updated', c: true };
      const merged = factory.merge(base, partial);
      
      expect(merged).toEqual({ a: 1, b: 'updated', c: true });
    });

    it('should create with defaults', () => {
      const factory = new ObjectFactory<{ id: number; name: string; active: boolean }>();
      const defaults = { active: true };
      
      const obj = factory.createWithDefaults({ id: 1, name: 'test' }, defaults);
      
      expect(obj).toEqual({ id: 1, name: 'test', active: true });
    });
  });

  describe('HeadersFactory', () => {
    it('should create basic headers', () => {
      const factory = new HeadersFactory();
      const headers = factory.create();
      
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should merge custom headers', () => {
      const factory = new HeadersFactory();
      const headers = factory.create({
        Authorization: 'Bearer token',
        'X-Custom': 'value',
      });
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'X-Custom': 'value',
      });
    });

    it('should create authorization header', () => {
      const factory = new HeadersFactory();
      const headers = factory.withAuth('Bearer mytoken');
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mytoken',
      });
    });

    it('should create headers for form data', () => {
      const factory = new HeadersFactory();
      const headers = factory.forFormData();
      
      expect(headers['Content-Type']).toBe('multipart/form-data');
    });

    it('should create headers with custom content type', () => {
      const factory = new HeadersFactory();
      const headers = factory.withContentType('text/plain');
      
      expect(headers['Content-Type']).toBe('text/plain');
    });
  });

  describe('createFactory', () => {
    it('should create a factory function', () => {
      const factory = createFactory<{ id: string; value: number }>((config) => ({
        id: config.id,
        value: config.value * 2,
      }));
      
      const obj = factory({ id: 'test', value: 5 });
      
      expect(obj).toEqual({ id: 'test', value: 10 });
    });

    it('should handle different creation functions', () => {
      interface Config {
        type: string;
        size: number;
      }
      
      interface Result {
        type: string;
        size: number;
        area: number;
      }
      
      const factory = createFactory<Config, Result>((config) => ({
        ...config,
        area: config.size * config.size,
      }));
      
      const result = factory({ type: 'square', size: 4 });
      
      expect(result).toEqual({ type: 'square', size: 4, area: 16 });
    });
  });
});
