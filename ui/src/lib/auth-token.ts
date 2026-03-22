import crypto from 'node:crypto';

// Generate a secure, random token in memory when the server starts.
// This ensures that only the session that configures the keys (or restarts the server)
// can modify them, and an attacker cannot guess the token.
export const SESSION_AUTH_TOKEN = crypto.randomBytes(32).toString('hex');
