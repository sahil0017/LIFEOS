/**
 * Jest setup file
 * Configure global mocks and settings
 */

// Mock fetch globally
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Mock Request
global.Request = class Request {
  constructor(url, options) {
    this.url = url;
    this.method = options?.method || 'GET';
    this.headers = options?.headers || {};
    this.body = options?.body;
  }
};

// Mock Response
global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.ok = (init?.status || 200) >= 200 && (init?.status || 200) < 300;
    this.statusText = init?.statusText || 'OK';
    this.headers = init?.headers || {};
  }
  
  async json() {
    return JSON.parse(this.body);
  }
  
  async text() {
    return this.body;
  }
  
  async blob() {
    return this.body;
  }
};

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
console.error = jest.fn((...args) => {
  originalConsoleError(...args);
});

const originalConsoleWarn = console.warn;
console.warn = jest.fn((...args) => {
  originalConsoleWarn(...args);
});

// Set default timeout for async tests
jest.setTimeout(10000);
