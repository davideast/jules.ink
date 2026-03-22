import { defineMiddleware } from 'astro:middleware';
import { checkKeysConfigured } from './lib/api-keys';
import { SESSION_AUTH_TOKEN } from './lib/auth-token';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname === '/api/keys' && context.request.method === 'POST') {
    const configured = await checkKeysConfigured();

    // If keys are already configured, require authentication
    if (configured) {
      const authCookie = context.cookies.get('auth_token');
      if (!authCookie || authCookie.value !== SESSION_AUTH_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized to modify configured keys' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }
  return next();
});
