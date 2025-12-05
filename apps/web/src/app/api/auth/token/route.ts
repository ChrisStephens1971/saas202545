import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IS_PROD_LIKE } from '@/config/env';

// Mark this route as dynamic (not statically rendered)
export const dynamic = 'force-dynamic';

// Use Node.js runtime for jsonwebtoken compatibility
export const runtime = 'nodejs';

/**
 * SECURITY FIX (C3): JWT secret configuration with no hardcoded fallbacks.
 *
 * - Production/Staging: MUST have NEXTAUTH_SECRET set (fail fast otherwise)
 * - Development: Generate random secret at runtime if not set
 *
 * See: docs/SECURITY-AUDIT-2025-12-04.md (C3)
 */
const JWT_SECRET = (() => {
  const secret = process.env.NEXTAUTH_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  // In production or staging, fail fast
  if (IS_PROD_LIKE) {
    throw new Error(
      'FATAL: NEXTAUTH_SECRET environment variable must be set in production/staging. ' +
      'The secret must be at least 32 characters.'
    );
  }

  // In development, generate a random secret at runtime
  const randomSecret = crypto.randomBytes(32).toString('hex');
  console.warn(
    '[SECURITY] NEXTAUTH_SECRET not set or too short. ' +
    'Generated random secret for this session. ' +
    'Tokens will be INVALID after server restart.'
  );
  return randomSecret;
})();

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate JWT token with user info
    const token = jwt.sign(
      {
        userId: session.user.id,
        role: session.user.role,
        tenantId: session.user.tenantId || 'default-tenant',
        personId: session.user.id, // Map to personId for now
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      {
        expiresIn: '12h',
      }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
