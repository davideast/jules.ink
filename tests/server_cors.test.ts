import { describe, it, expect, beforeAll } from 'vitest';

// Set environment variables before importing the app
process.env.ALLOWED_ORIGINS = 'http://trusted.com,http://another-trusted.com';

describe('Server CORS', () => {
  it('should allow a trusted origin', async () => {
    // Dynamically import the app to ensure environment variables are picked up
    const { default: app } = await import('../src/server.js');

    const res = await app.request('/api/generate', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://trusted.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://trusted.com');
  });

  it('should allow another trusted origin', async () => {
    const { default: app } = await import('../src/server.js');

    const res = await app.request('/api/generate', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://another-trusted.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://another-trusted.com');
  });

  it('should not allow an untrusted origin', async () => {
    const { default: app } = await import('../src/server.js');

    const res = await app.request('/api/generate', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://malicious.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
