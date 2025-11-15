import jwt from 'jsonwebtoken';
import { AuthToken, User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '12h';

export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    personId: user.personId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}
