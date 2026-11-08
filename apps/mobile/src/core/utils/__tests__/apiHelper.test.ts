/**
 * Tests for API helper utilities.
 */

import {
  normalizeUrl,
  joinUrl,
  buildQueryString,
  buildUrl,
  request,
  api,
  checkApiHealth,
} from '../apiHelper';

describe('API Helper', () => {
  describe('normalizeUrl', () => {
    it('should add https:// to url without protocol', () => {
      expect(normalizeUrl('api.example.com')).toBe('https://api.example.com');
      expect(normalizeUrl('example.com/path')).toBe('https://example.com/path');
    });

    it('should preserve existing http:// protocol', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should preserve existing https:// protocol', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should preserve protocol with path', () => {
      expect(normalizeUrl('https://example.com/api/users')).toBe(
        'https://example.com/api/users'
      );
    });

    it('should preserve protocol with port', () => {
      expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });
  });

  describe('joinUrl', () => {
    it('should join base URL with path', () => {
      expect(joinUrl('https://example.com', 'api')).toBe('https://example.com/api');
      expect(joinUrl('https://example.com/', 'api')).toBe('https://example.com/api');
    });

    it('should join multiple paths', () => {
      expect(joinUrl('https://example.com', 'api', 'users')).toBe(
        'https://example.com/api/users'
      );
      expect(joinUrl('https://example.com', 'api', 'users', '123')).toBe(
        'https://example.com/api/users/123'
      );
    });

    it('should handle trailing slashes', () => {
      expect(joinUrl('https://example.com/', '/api')).toBe('https://example.com/api');
      expect(joinUrl('https://example.com', '/api/')).toBe('https://example.com/api');
    });

    it('should handle parent directory references', () => {
      expect(joinUrl('https://example.com/api/v1', '../v2')).toBe(
        'https://example.com/api/v2'
      );
      expect(joinUrl('https://example.com/api/v1', '..')).toBe(
        'https://example.com/api'
      );
    });

    it('should handle current directory references', () => {
      expect(joinUrl('https://example.com/api', '.', 'users')).toBe(
        'https://example.com/api/users'
      );
    });

    it('should handle empty path segments', () => {
      expect(joinUrl('https://example.com', '', 'api')).toBe('https://example.com/api');
    });

    it('should work with protocol-relative URLs', () => {
      expect(joinUrl('//example.com', 'api')).toBe('https://example.com/api');
    });
  });

  describe('buildQueryString', () => {
    it('should build query string from params object', () => {
      const params = { page: 1, limit: 10, search: 'test' };
      const query = buildQueryString(params);
      
      expect(query).toContain('page=1');
      expect(query).toContain('limit=10');
      expect(query).toContain('search=test');
      expect(query.startsWith('?')).toBe(true);
    });

    it('should return empty string for empty params', () => {
      expect(buildQueryString({})).toBe('');
    });

    it('should ignore undefined values', () => {
      const params = { page: 1, limit: undefined, search: 'test' };
      const query = buildQueryString(params);
      
      expect(query).toContain('page=1');
      expect(query).toContain('search=test');
      expect(query).not.toContain('limit');
    });

    it('should ignore null values', () => {
      const params = { page: 1, limit: null, search: 'test' };
      const query = buildQueryString(params);
      
      expect(query).toContain('page=1');
      expect(query).toContain('search=test');
      expect(query).not.toContain('limit');
    });

    it('should convert numbers to strings', () => {
      const params = { page: 1, limit: 10 };
      const query = buildQueryString(params);
      
      expect(query).toContain('page=1');
      expect(query).toContain('limit=10');
    });

    it('should convert booleans to strings', () => {
      const params = { active: true, hidden: false };
      const query = buildQueryString(params);
      
      expect(query).toContain('active=true');
      expect(query).toContain('hidden=false');
    });

    it('should encode special characters', () => {
      const params = { query: 'hello world', filter: 'a&b' };
      const query = buildQueryString(params);
      
      expect(query).toContain('query=hello+world');
      expect(query).toContain('filter=a%26b');
    });

    it('should handle multiple values for same key', () => {
      const params = { ids: [1, 2, 3] };
      const query = buildQueryString(params as any);
      
      // URLSearchParams handles arrays differently
      // This test verifies it doesn't throw
      expect(query).toBeDefined();
    });
  });

  describe('buildUrl', () => {
    it('should build URL with path', () => {
      const url = buildUrl('https://example.com', 'api/users');
      expect(url).toBe('https://example.com/api/users');
    });

    it('should build URL with query params', () => {
      const url = buildUrl('https://example.com/api', '', { page: 1, limit: 10 });
      expect(url).toContain('https://example.com/api');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=10');
    });

    it('should build URL with both path and query params', () => {
      const url = buildUrl('https://example.com', 'api/users', { page: 1 });
      expect(url).toContain('https://example.com/api/users');
      expect(url).toContain('page=1');
    });

    it('should handle empty path and params', () => {
      const url = buildUrl('https://example.com');
      expect(url).toBe('https://example.com/');
    });

    it('should handle base URL with trailing slash', () => {
      const url = buildUrl('https://example.com/', 'api/users');
      expect(url).toBe('https://example.com/api/users');
    });

    it('should handle path with leading slash', () => {
      const url = buildUrl('https://example.com', '/api/users');
      expect(url).toBe('https://example.com/api/users');
    });
  });

  describe('request', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should make GET request with default options', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        ok: true,
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await request('https://api.example.com/data');
      
      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make POST request with body', async () => {
      const mockResponse = new Response(JSON.stringify({ created: true }), {
        status: 201,
        ok: true,
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await request('https://api.example.com/data', {
        method: 'POST',
        body: { name: 'test' },
      });
      
      expect(result).toEqual({ created: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('should handle successful responses', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        ok: true,
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await request('https://api.example.com/data');
      expect(result).toEqual({ success: true });
    });

    it('should handle error responses', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        ok: false,
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(request('https://api.example.com/not-found')).rejects.toBeDefined();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(request('https://api.example.com/data')).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      const mockAbort = jest.fn();
      const mockSignal = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      
      // Mock AbortController
      (global as any).AbortController = jest.fn(() => ({
        signal: mockSignal,
        abort: mockAbort,
      }));

      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await request('https://api.example.com/data', {
        timeout: 5000,
      });
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should retry on failure', async () => {
      let callCount = 0;
      
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockResponse);
      });

      const result = await request('https://api.example.com/data', {
        retries: 3,
        retryDelay: 0,
      });
      
      expect(result).toEqual({ data: 'test' });
      expect(callCount).toBe(3);
    });
  });

  describe('api convenience methods', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should make GET request', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        ok: true,
        headers: { 'Content-Type': 'application/json' },
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await api.get('https://api.example.com/data', {
        page: 1,
        limit: 10,
      });
      
      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.anything()
      );
    });

    it('should make POST request', async () => {
      const mockResponse = new Response(JSON.stringify({ created: true }), {
        status: 201,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await api.post('https://api.example.com/data', {
        name: 'test',
      });
      
      expect(result).toEqual({ created: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('should make PUT request', async () => {
      const mockResponse = new Response(JSON.stringify({ updated: true }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await api.put('https://api.example.com/data/1', {
        name: 'updated',
      });
      
      expect(result).toEqual({ updated: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'updated' }),
        })
      );
    });

    it('should make PATCH request', async () => {
      const mockResponse = new Response(JSON.stringify({ updated: true }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await api.patch('https://api.example.com/data/1', {
        name: 'updated',
      });
      
      expect(result).toEqual({ updated: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'updated' }),
        })
      );
    });

    it('should make DELETE request', async () => {
      const mockResponse = new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await api.delete('https://api.example.com/data/1');
      
      expect(result).toEqual({ deleted: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('checkApiHealth', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return true for successful health check', async () => {
      const mockResponse = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const isHealthy = await checkApiHealth('https://api.example.com');
      expect(isHealthy).toBe(true);
    });

    it('should return false for failed health check', async () => {
      const mockResponse = new Response(JSON.stringify({ status: 'error' }), {
        status: 500,
        ok: false,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const isHealthy = await checkApiHealth('https://api.example.com');
      expect(isHealthy).toBe(false);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const isHealthy = await checkApiHealth('https://api.example.com');
      expect(isHealthy).toBe(false);
    });

    it('should use custom endpoint', async () => {
      const mockResponse = new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        ok: true,
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await checkApiHealth('https://api.example.com', '/healthz');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/healthz',
        expect.anything()
      );
    });
  });
});
