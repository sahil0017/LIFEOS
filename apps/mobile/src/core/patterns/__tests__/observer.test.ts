/**
 * Tests for Observer pattern implementation.
 */

import {
  Subject,
  Observer,
  EventEmitter,
  CallbackObserver,
} from '../observer';

describe('Observer Pattern', () => {
  describe('Subject', () => {
    it('should allow observers to subscribe', () => {
      const subject = new Subject<string>();
      const observer: Observer<string> = {
        update: jest.fn(),
      };
      
      subject.subscribe(observer);
      subject.notify('test message');
      
      expect(observer.update).toHaveBeenCalledWith('test message');
    });

    it('should allow multiple observers to subscribe', () => {
      const subject = new Subject<number>();
      const observer1: Observer<number> = { update: jest.fn() };
      const observer2: Observer<number> = { update: jest.fn() };
      
      subject.subscribe(observer1);
      subject.subscribe(observer2);
      subject.notify(42);
      
      expect(observer1.update).toHaveBeenCalledWith(42);
      expect(observer2.update).toHaveBeenCalledWith(42);
    });

    it('should allow observers to unsubscribe', () => {
      const subject = new Subject<string>();
      const observer: Observer<string> = { update: jest.fn() };
      
      subject.subscribe(observer);
      subject.notify('first');
      expect(observer.update).toHaveBeenCalledTimes(1);
      
      subject.unsubscribe(observer);
      subject.notify('second');
      expect(observer.update).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in observer callbacks', () => {
      const subject = new Subject<string>();
      const goodObserver: Observer<string> = { update: jest.fn() };
      const badObserver: Observer<string> = {
        update: jest.fn(() => {
          throw new Error('Observer error');
        }),
      };
      
      subject.subscribe(goodObserver);
      subject.subscribe(badObserver);
      
      // Should not throw and should call all observers
      expect(() => subject.notify('test')).not.toThrow();
      expect(goodObserver.update).toHaveBeenCalledWith('test');
      expect(badObserver.update).toHaveBeenCalledWith('test');
    });

    it('should clear all observers', () => {
      const subject = new Subject<string>();
      const observer1: Observer<string> = { update: jest.fn() };
      const observer2: Observer<string> = { update: jest.fn() };
      
      subject.subscribe(observer1);
      subject.subscribe(observer2);
      subject.clear();
      
      subject.notify('test');
      expect(observer1.update).not.toHaveBeenCalled();
      expect(observer2.update).not.toHaveBeenCalled();
    });

    it('should return number of subscribers', () => {
      const subject = new Subject<string>();
      const observer1: Observer<string> = { update: jest.fn() };
      const observer2: Observer<string> = { update: jest.fn() };
      
      expect(subject.subscriberCount()).toBe(0);
      
      subject.subscribe(observer1);
      expect(subject.subscriberCount()).toBe(1);
      
      subject.subscribe(observer2);
      expect(subject.subscriberCount()).toBe(2);
      
      subject.unsubscribe(observer1);
      expect(subject.subscriberCount()).toBe(1);
    });
  });

  describe('EventEmitter', () => {
    it('should allow subscribing to events', () => {
      const emitter = new EventEmitter<string>();
      const callback = jest.fn();
      
      emitter.on('test', callback);
      emitter.emit('test', 'test data');
      
      expect(callback).toHaveBeenCalledWith('test data');
    });

    it('should allow multiple callbacks for same event', () => {
      const emitter = new EventEmitter<number>();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      emitter.on('event', callback1);
      emitter.on('event', callback2);
      emitter.emit('event', 42);
      
      expect(callback1).toHaveBeenCalledWith(42);
      expect(callback2).toHaveBeenCalledWith(42);
    });

    it('should allow unsubscribing from events', () => {
      const emitter = new EventEmitter<string>();
      const callback = jest.fn();
      
      const unsubscribe = emitter.on('test', callback);
      emitter.emit('test', 'first');
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      emitter.emit('test', 'second');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should support once (single call) subscriptions', () => {
      const emitter = new EventEmitter<string>();
      const callback = jest.fn();
      
      emitter.once('test', callback);
      emitter.emit('test', 'first');
      emitter.emit('test', 'second');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should support multiple events', () => {
      const emitter = new EventEmitter<string | number>();
      const callbackA = jest.fn();
      const callbackB = jest.fn();
      
      emitter.on('eventA', callbackA);
      emitter.on('eventB', callbackB);
      
      emitter.emit('eventA', 'data A');
      emitter.emit('eventB', 'data B');
      
      expect(callbackA).toHaveBeenCalledWith('data A');
      expect(callbackB).toHaveBeenCalledWith('data B');
    });

    it('should clear all listeners', () => {
      const emitter = new EventEmitter<string>();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      emitter.on('event', callback1);
      emitter.on('event', callback2);
      emitter.clear();
      
      emitter.emit('event', 'test');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle errors in callbacks', () => {
      const emitter = new EventEmitter<string>();
      const goodCallback = jest.fn();
      const badCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      emitter.on('event', goodCallback);
      emitter.on('event', badCallback);
      
      expect(() => emitter.emit('event', 'test')).not.toThrow();
      expect(goodCallback).toHaveBeenCalledWith('test');
    });
  });

  describe('CallbackObserver', () => {
    it('should wrap a callback function as an observer', () => {
      const callback = jest.fn();
      const observer = new CallbackObserver(callback);
      
      observer.update('test data');
      
      expect(callback).toHaveBeenCalledWith('test data');
    });

    it('should handle errors in callback', () => {
      const callback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const observer = new CallbackObserver(callback);
      
      expect(() => observer.update('test')).not.toThrow();
      expect(callback).toHaveBeenCalledWith('test');
    });
  });
});
