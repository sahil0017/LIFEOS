/**
 * Tests for API client implementation.
 */

import {
  ApiClient,
  SingletonApiClient,
  apiClient,
  createApiClient,
  createApiClientForUrl,
  createMockApiClient,
  RetryApiClient,
  type ApiClientConfig,
  type ApiStrategyType,
} from '../client';
import { FetchStrategy, RetryStrategy, TimeoutStrategy } from '../../core/patterns/strategy';

describe('API Client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    // Reset singleton instance
    SingletonApiClient.reset();
  });

  describe('ApiClient', () => {
    it('should be instantiable with default config', () => {
      const client = new ApiClient();
      expect(client).toBeDefined();
    });

    it('should be instantiable with custom config', () => {
      const config: Partial<ApiClientConfig> = {
        baseUrl: 'https://custom-api.example.com',
        timeout: 10000,
        maxRetries: 5,
      };
      const client = new ApiClient(config);
      expect(client).toBeDefined();
    });

    it('should set and get auth token', () => {
      const client = new ApiClient();
      
      client.setAuthToken('test-token');
      // Verify token is set by checking headers
      expect(client['config'].authToken).toBe('test-token');
      expect(client['config'].withAuth).toBe(true);
      
      client.clearAuthToken();
      expect(client['config'].authToken).toBeUndefined();
      expect(client['config'].withAuth).toBe(false);
    });

    it('should update configuration', () => {
      const client = new ApiClient({ timeout: 1000 });
      
      client.updateConfig({ timeout: 2000, maxRetries: 5 });
      
      expect(client['config'].timeout).toBe(2000);
      expect(client['config'].maxRetries).toBe(5);
    });

    it('should change strategy', () => {
      const client = new ApiClient();
      
      client.setStrategy('retry');
      // Strategy is private, so we can't directly verify, but we can test behavior
      expect(client['strategy']).toBeDefined();
    });

    it('should build request URL correctly', () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      
      // Access private method through reflection for testing
      const buildRequestUrl = (client as any).buildRequestUrl.bind(client);
      
      expect(buildRequestUrl('/users')).toBe('https://api.example.com/users');
      expect(buildRequestUrl('/users', { page: 1 })).toContain('https://api.example.com/users');
      expect(buildRequestUrl('/users', { page: 1 })).toContain('page=1');
    });

    it('should build headers correctly', () => {
      const client = new ApiClient();
      
      const buildHeaders = (client as any).buildHeaders.bind(client);
      
      const headers = buildHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
      
      client.setAuthToken('test-token');
      const headersWithAuth = buildHeaders();
      expect(headersWithAuth['Authorization']).toBe('Bearer test-token');
    });

    it('should build options correctly', () => {
      const client = new ApiClient();
      
      const buildOptions = (client as any).buildOptions.bind(client);
      
      const options = buildOptions('GET');
      expect(options.method).toBe('GET');
      
      const optionsWithBody = buildOptions('POST', { name: 'test' });
      expect(optionsWithBody.method).toBe('POST');
      expect(optionsWithBody.body).toBe(JSON.stringify({ name: 'test' }));
    });

    it('should make GET request', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.get('/users');
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request', async () => {
      const mockResponse = new Response(JSON.stringify({ created: true }), {
        status: 201,
        
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.post('/users', { name: 'John' });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ created: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'John' }),
        })
      );
    });

    it('should make PUT request', async () => {
      const mockResponse = new Response(JSON.stringify({ updated: true }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.put('/users/1', { name: 'Updated' });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ updated: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        })
      );
    });

    it('should make PATCH request', async () => {
      const mockResponse = new Response(JSON.stringify({ updated: true }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.patch('/users/1', { name: 'Updated' });
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ updated: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated' }),
        })
      );
    });

    it('should make DELETE request', async () => {
      const mockResponse = new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.delete('/users/1');
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ deleted: true });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should include auth token in requests', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      client.setAuthToken('test-token');
      
      await client.get('/users');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle successful response', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.request('GET', '/users');
      
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ data: 'test' });
    });

    it('should handle 404 response', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      
      await expect(client.get('/not-found')).rejects.toBeDefined();
    });

    it('should handle 500 response', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      
      await expect(client.get('/error')).rejects.toBeDefined();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      
      await expect(client.get('/users')).rejects.toThrow();
    });

    it('should call onRequest callback', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const onRequest = jest.fn();
      const client = new ApiClient({
        baseUrl: 'https://api.example.com',
        onRequest,
      });
      
      await client.get('/users');
      
      expect(onRequest).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.any(Object)
      );
    });

    it('should call onResponse callback', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const onResponse = jest.fn();
      const client = new ApiClient({
        baseUrl: 'https://api.example.com',
        onResponse,
      });
      
      await client.get('/users');
      
      expect(onResponse).toHaveBeenCalledWith(
        mockResponse,
        expect.stringContaining('/users')
      );
    });

    it('should call onError callback', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const onError = jest.fn();
      const client = new ApiClient({
        baseUrl: 'https://api.example.com',
        onError,
      });
      
      try {
        await client.get('/users');
      } catch {
        // Expected to fail
      }
      
      expect(onError).toHaveBeenCalled();
    });

    it('should make raw request with query params', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.request('GET', '/users', undefined, { page: 1, limit: 10 });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.anything()
      );
    });

    it('should make request with custom headers', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      await client.get('/users', undefined, { 'X-Custom': 'value' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('SingletonApiClient', () => {
    it('should return same instance for same config', () => {
      const instance1 = SingletonApiClient.getInstance();
      const instance2 = SingletonApiClient.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create new instance for different config', () => {
      const instance1 = SingletonApiClient.getInstance({ baseUrl: 'https://api1.example.com' });
      const instance2 = SingletonApiClient.getInstance({ baseUrl: 'https://api2.example.com' });
      
      // After getting different config, should create new instance
      expect(instance1).not.toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = SingletonApiClient.getInstance();
      SingletonApiClient.reset();
      const instance2 = SingletonApiClient.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });

    it('should set auth token on singleton instance', () => {
      const client = SingletonApiClient.getInstance();
      SingletonApiClient.setAuthToken('test-token');
      
      expect(client['config'].authToken).toBe('test-token');
    });

    it('should clear auth token on singleton instance', () => {
      SingletonApiClient.setAuthToken('test-token');
      SingletonApiClient.clearAuthToken();
      
      const client = SingletonApiClient.getInstance();
      expect(client['config'].authToken).toBeUndefined();
    });
  });

  describe('apiClient (default instance)', () => {
    it('should be a singleton instance', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient).toBeInstanceOf(ApiClient);
    });

    it('should be same instance as SingletonApiClient.getInstance()', () => {
      const singletonInstance = SingletonApiClient.getInstance();
      expect(apiClient).toBe(singletonInstance);
    });
  });

  describe('createApiClient', () => {
    it('should create new ApiClient instance', () => {
      const client = createApiClient({ baseUrl: 'https://custom.example.com' });
      
      expect(client).toBeInstanceOf(ApiClient);
      expect(client['config'].baseUrl).toBe('https://custom.example.com');
    });

    it('should create instance with default config', () => {
      const client = createApiClient();
      
      expect(client).toBeInstanceOf(ApiClient);
      expect(client['config'].baseUrl).toBe('https://api.lifeos.com');
    });
  });

  describe('createApiClientForUrl', () => {
    it('should create client with specified base URL', () => {
      const client = createApiClientForUrl('https://custom.example.com');
      
      expect(client).toBeInstanceOf(ApiClient);
      expect(client['config'].baseUrl).toBe('https://custom.example.com');
    });
  });

  describe('createMockApiClient', () => {
    it('should create mock client with stubbed methods', () => {
      const mockClient = createMockApiClient();
      
      expect(mockClient.setStrategy).toBeDefined();
      expect(mockClient.updateConfig).toBeDefined();
      expect(mockClient.setAuthToken).toBeDefined();
      expect(mockClient.clearAuthToken).toBeDefined();
      
      // Verify methods are functions
      expect(typeof mockClient.setStrategy).toBe('function');
      expect(typeof mockClient.updateConfig).toBe('function');
      expect(typeof mockClient.setAuthToken).toBe('function');
      expect(typeof mockClient.clearAuthToken).toBe('function');
    });

    it('should return partial ApiClient', () => {
      const mockClient = createMockApiClient();
      
      // Should not have all ApiClient methods
      expect(mockClient.get).toBeUndefined();
      expect(mockClient.post).toBeUndefined();
    });
  });

  describe('RetryApiClient', () => {
    it('should extend ApiClient', () => {
      const client = new RetryApiClient({
        maxRetries: 3,
        delay: 100,
      });
      
      expect(client).toBeInstanceOf(ApiClient);
      expect(client).toBeInstanceOf(RetryApiClient);
    });

    it('should retry on failure', async () => {
      let callCount = 0;
      
      const mockResponses = [
        new Response(JSON.stringify({ error: 'Failure' }), { status: 500 }),
        new Response(JSON.stringify({ error: 'Failure' }), { status: 500 }),
        new Response(JSON.stringify({ data: 'success' }), { status: 200 }),
      ];

      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockResponses[callCount++]);
      });

      const client = new RetryApiClient({
        maxRetries: 3,
        delay: 0,
      });

      // Mock the parent request to use our fetch mock
      const result = await client.request('GET', '/test');
      
      expect(result.ok).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should pass arguments correctly', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const client = new RetryApiClient({
        maxRetries: 3,
        delay: 0,
      });

      await client.request('POST', '/test', { data: 'test' });
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });
  });

  describe('Authentication methods', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ token: 'test-token', user: { id: 1 } }), {
          status: 200,
          
        })
      );
    });

    it('should login', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.login({ email: 'test@example.com', password: 'password' });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      );
    });

    it('should get current user', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      client.setAuthToken('test-token');
      
      const result = await client.getMe();
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/me'),
        expect.anything()
      );
    });

    it('should logout', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.logout();
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Goals methods', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ goals: [], total: 0, page: 1, limit: 10, hasMore: false }), {
          status: 200,
          
        })
      );
    });

    it('should get all goals', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.getGoals({ page: 1, limit: 10 });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/goals'),
        expect.anything()
      );
    });

    it('should get single goal', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ id: '1', title: 'Test Goal' }), {
          status: 200,
          
        })
      );

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.getGoal('1');
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/goals/1'),
        expect.anything()
      );
    });

    it('should create goal', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ id: '1', title: 'New Goal' }), {
          status: 201,
          
        })
      );

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.createGoal({ title: 'New Goal', description: 'Test' });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/goals'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Goal', description: 'Test' }),
        })
      );
    });

    it('should update goal', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ id: '1', title: 'Updated Goal' }), {
          status: 200,
          
        })
      );

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.updateGoal('1', { title: 'Updated Goal' });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/goals/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ title: 'Updated Goal' }),
        })
      );
    });

    it('should delete goal', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ id: '1', title: 'Deleted Goal' }), {
          status: 200,
          
        })
      );

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.deleteGoal('1');
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/goals/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Engine methods', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({
          engineId: 'test',
          result: { summary: 'Test result' },
          timestamp: new Date().toISOString(),
        }), {
          status: 200,
          
        })
      );
    });

    it('should run engine', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.runEngine({
        engineId: 'test',
        input: { goals: [], userId: '1' },
      });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/run'),
        expect.anything()
      );
    });

    it('should get engine result', async () => {
      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.getEngineResult('test', { goals: [], userId: '1' });
      
      expect(result.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/engines/test'),
        expect.anything()
      );
    });
  });

  describe('Health check', () => {
    it('should check API health', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          
        })
      );

      const client = new ApiClient({ baseUrl: 'https://api.example.com' });
      const result = await client.healthCheck();
      
      expect(result.ok).toBe(true);
      expect(result.data.status).toBe('ok');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.anything()
      );
    });
  });
});
