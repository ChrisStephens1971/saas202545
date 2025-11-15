# Azure AD B2C Authentication Setup Guide

This guide walks through integrating Azure AD B2C authentication for the Elder-First Church Platform.

## Overview

Azure AD B2C provides:
- ✅ Secure user authentication
- ✅ Social identity provider integration (Google, Facebook, Microsoft)
- ✅ Multi-factor authentication (MFA)
- ✅ Customizable user flows
- ✅ Built-in password reset and profile management

## Prerequisites

- Azure subscription
- Azure CLI installed
- Admin access to create Azure resources

## Step 1: Create Azure AD B2C Tenant

### Via Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → Search for "Azure Active Directory B2C"
3. Click "Create"
4. Select "Create a new Azure AD B2C Tenant"
5. Fill in:
   - **Organization name**: `Elder-First Church`
   - **Initial domain name**: `elderfirstchurch` (results in `elderfirstchurch.onmicrosoft.com`)
   - **Country/Region**: United States
6. Click "Review + create" → "Create"

### Via Azure CLI

```bash
az ad b2c tenant create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --location "East US 2" \
  --display-name "Elder-First Church" \
  --domain-name "elderfirstchurch.b2clogin.com"
```

## Step 2: Register Application

1. Switch to your B2C tenant in Azure Portal
2. Navigate to "Azure AD B2C" → "App registrations" → "New registration"
3. Fill in:
   - **Name**: `Elder-First Church Platform`
   - **Supported account types**: Accounts in any identity provider or organizational directory
   - **Redirect URI**:
     - Type: `Web`
     - URI: `http://localhost:3045/api/auth/callback/azure-ad-b2c` (dev)
     - URI: `https://your-domain.com/api/auth/callback/azure-ad-b2c` (prod)
4. Click "Register"
5. Note down:
   - **Application (client) ID**: `abc123...`
   - **Directory (tenant) ID**: `def456...`

## Step 3: Create Client Secret

1. In your app registration, go to "Certificates & secrets"
2. Click "New client secret"
3. Description: `Elder-First Platform Secret`
4. Expires: 24 months
5. Click "Add"
6. **Copy the secret value immediately** (you won't be able to see it again)

## Step 4: Configure User Flows

### Sign Up and Sign In Flow

1. Navigate to "Azure AD B2C" → "User flows"
2. Click "New user flow" → "Sign up and sign in" → "Recommended"
3. Name: `B2C_1_signupsignin`
4. Identity providers:
   - ✅ Email signup
   - ✅ Social (optional: Google, Facebook, Microsoft)
5. User attributes to collect:
   - ✅ Email Address (required)
   - ✅ Given Name (required)
   - ✅ Surname (required)
   - ✅ Display Name (optional)
6. Application claims to return:
   - ✅ Email Addresses
   - ✅ Given Name
   - ✅ Surname
   - ✅ Display Name
   - ✅ User's Object ID
7. Click "Create"

### Password Reset Flow

1. Click "New user flow" → "Password reset" → "Recommended"
2. Name: `B2C_1_passwordreset`
3. Identity providers: ✅ Reset password using email address
4. Application claims:
   - ✅ Email Addresses
   - ✅ User's Object ID
5. Click "Create"

### Profile Editing Flow

1. Click "New user flow" → "Profile editing" → "Recommended"
2. Name: `B2C_1_profileediting`
3. User attributes to edit:
   - ✅ Given Name
   - ✅ Surname
   - ✅ Display Name
4. Click "Create"

## Step 5: Configure Application Environment Variables

Update `.env.local` in `apps/web`:

```bash
# Azure AD B2C Configuration
AZURE_AD_B2C_TENANT_NAME=elderfirstchurch
AZURE_AD_B2C_CLIENT_ID=abc123-your-client-id
AZURE_AD_B2C_CLIENT_SECRET=your-client-secret-value
AZURE_AD_B2C_PRIMARY_USER_FLOW=B2C_1_signupsignin

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3045
NEXTAUTH_SECRET=your-nextauth-secret-here
```

## Step 6: Install NextAuth.js

```bash
cd apps/web
npm install next-auth @auth/core
```

## Step 7: Create NextAuth API Route

Create `apps/web/src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import AzureADB2CProvider from 'next-auth/providers/azure-ad-b2c';

const handler = NextAuth({
  providers: [
    AzureADB2CProvider({
      tenantId: process.env.AZURE_AD_B2C_TENANT_NAME,
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET!,
      primaryUserFlow: process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW,
      authorization: { params: { scope: 'offline_access openid' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.userId = profile?.sub || profile?.oid;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.userId = token.userId;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
});

export { handler as GET, handler as POST };
```

## Step 8: Update tRPC Context

Update `apps/api/src/trpc.ts` to extract user from NextAuth session:

```typescript
import { getServerSession } from 'next-auth';

export const createContext = async () => {
  const session = await getServerSession();

  return {
    userId: session?.userId,
    tenantId: session?.tenantId, // Map from user profile
  };
};
```

## Step 9: Protect Routes

Wrap protected pages with authentication:

```typescript
// apps/web/src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>Dashboard content...</div>
  );
}
```

## Step 10: Add Sign In / Sign Out Buttons

```typescript
// apps/web/src/components/AuthButtons.tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from './ui/Button';

export function AuthButtons() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span>Welcome, {session.user?.name}</span>
        <Button onClick={() => signOut()}>Sign Out</Button>
      </div>
    );
  }

  return <Button onClick={() => signIn('azure-ad-b2c')}>Sign In</Button>;
}
```

## Step 11: Configure Social Identity Providers (Optional)

### Google

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com)
2. In Azure AD B2C → Identity providers → Add "Google"
3. Client ID: From Google Console
4. Client Secret: From Google Console
5. Add to user flows

### Facebook

1. Create app in [Facebook Developers](https://developers.facebook.com)
2. In Azure AD B2C → Identity providers → Add "Facebook"
3. App ID: From Facebook
4. App Secret: From Facebook
5. Add to user flows

## Step 12: Customize Branding (Optional)

1. Navigate to "Company branding" in Azure AD B2C
2. Upload:
   - Logo (280x60px)
   - Background image (1920x1080px)
   - Custom CSS for full customization
3. Configure colors to match church branding

## Step 13: Testing

### Local Testing

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3045/login`
3. Click "Sign In"
4. Should redirect to Azure AD B2C login page
5. Sign up with test email
6. Should redirect back to app with session

### Test Flows

- ✅ Sign up with new email
- ✅ Sign in with existing account
- ✅ Password reset
- ✅ Profile editing
- ✅ Sign out

## Production Deployment

### Update Redirect URIs

1. In Azure AD B2C → App registrations → Your app
2. Add production redirect URI:
   - `https://yourdomain.com/api/auth/callback/azure-ad-b2c`
3. Update `NEXTAUTH_URL` in production environment variables

### Security Checklist

- ✅ Client secret stored in Azure Key Vault (not in code)
- ✅ HTTPS enforced on all auth endpoints
- ✅ NextAuth secret is cryptographically secure (32+ characters)
- ✅ Token expiration configured (1 hour access, 90 days refresh)
- ✅ MFA enabled for admin accounts
- ✅ Rate limiting configured on auth endpoints

## Monitoring

Set up Application Insights for monitoring:

```bash
az monitor app-insights create \
  --app elder-first-auth-insights \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --location eastus2
```

Monitor:
- Sign-in attempts
- Failed authentications
- Token usage
- API call patterns

## Cost Estimate

Azure AD B2C pricing (Pay-as-you-go):
- First 50,000 authentications/month: **Free**
- Additional authentications: $0.00325/auth
- MFA: $0.03/auth

**Estimated cost for small church (500 members, 2 logins/week):**
- Monthly authentications: ~4,000
- **Cost: $0/month** (under free tier)

## Troubleshooting

### "AADB2C90118: The user has forgotten their password"

This error code means user clicked "Forgot password". Handle it:

```typescript
// In auth error handler
if (error.includes('AADB2C90118')) {
  router.push('/auth/reset-password');
}
```

### "AADB2C90091: User cancelled"

User clicked "Cancel" button. Redirect back to login:

```typescript
if (error.includes('AADB2C90091')) {
  router.push('/login');
}
```

### Token expiration issues

Ensure refresh token rotation is enabled in NextAuth config:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 90 * 24 * 60 * 60, // 90 days
},
```

## Further Reading

- [Azure AD B2C Documentation](https://learn.microsoft.com/en-us/azure/active-directory-b2c/)
- [NextAuth.js Azure AD B2C Provider](https://next-auth.js.org/providers/azure-ad-b2c)
- [Azure AD B2C User Flows](https://learn.microsoft.com/en-us/azure/active-directory-b2c/user-flow-overview)
