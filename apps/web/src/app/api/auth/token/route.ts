import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import jwt from 'jsonwebtoken';

// Mark this route as dynamic (not statically rendered)
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';

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
