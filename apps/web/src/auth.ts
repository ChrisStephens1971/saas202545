import NextAuth, { DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADB2CProvider from 'next-auth/providers/azure-ad-b2c';

// Extend session types to include userId and role
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
      tenantId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
    tenantId?: string;
  }
}

const isDev = process.env.DEV_MODE === 'true';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: isDev
    ? [
        // Development mode: Simple credentials provider for testing
        CredentialsProvider({
          name: 'Development Credentials',
          credentials: {
            email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials) {
            // Development-only users
            const devUsers = [
              {
                id: 'dev-admin-1',
                email: 'admin@dev.com',
                name: 'Admin User',
                role: 'admin' as const,
                password: 'admin',
                tenantId: 'dev-tenant-1',
              },
              {
                id: 'dev-editor-1',
                email: 'editor@dev.com',
                name: 'Editor User',
                role: 'editor' as const,
                password: 'editor',
                tenantId: 'dev-tenant-1',
              },
              {
                id: 'dev-submitter-1',
                email: 'submitter@dev.com',
                name: 'Submitter User',
                role: 'submitter' as const,
                password: 'submitter',
                tenantId: 'dev-tenant-1',
              },
              {
                id: 'dev-viewer-1',
                email: 'viewer@dev.com',
                name: 'Viewer User',
                role: 'viewer' as const,
                password: 'viewer',
                tenantId: 'dev-tenant-1',
              },
              {
                id: 'dev-kiosk-1',
                email: 'kiosk@dev.com',
                name: 'Kiosk User',
                role: 'kiosk' as const,
                password: 'kiosk',
                tenantId: 'dev-tenant-1',
              },
            ];

            const user = devUsers.find(
              (u) => u.email === credentials.email && u.password === credentials.password
            );

            if (user) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
              };
            }

            return null;
          },
        }),
      ]
    : [
        // Production mode: Azure AD B2C
        AzureADB2CProvider({
          clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
          issuer: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/${process.env.AZURE_AD_B2C_TENANT_NAME}.onmicrosoft.com/${process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW}/v2.0`,
        }),
      ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }

      // Azure AD B2C token
      if (account && profile) {
        token.userId = profile.sub || profile.oid;
        // TODO: Map Azure AD B2C custom attribute to role
        // For now, default to viewer
        token.role = 'viewer';
        // TODO: Map tenant from Azure AD B2C or database
        token.tenantId = 'default-tenant';
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 90 * 24 * 60 * 60, // 90 days
  },
});
