import { AuthToken, User } from './types';

// TODO: Replace with proper NextAuth + Azure AD B2C implementation (see artifacts/P4_middleware.ts)
// This is a placeholder for the Foundation phase

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = 12 * 60 * 60; // 12 hours

export function generateToken(user: User): string {
  const payload: AuthToken = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    personId: user.personId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY,
  };

  // TODO: Use proper JWT library (jsonwebtoken)
  // For now, return a base64 encoded payload (NOT SECURE - dev only)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyToken(token: string): AuthToken | null {
  try {
    // TODO: Use proper JWT verification
    // For now, decode base64 (NOT SECURE - dev only)
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as AuthToken;

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
