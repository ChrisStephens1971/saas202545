# Deploy to Azure Staging for First Pastor Test

**Purpose:** Deploy the church platform to Azure in dev-mode for first real-world pastor testing.

**Target Audience:** Developers with basic Azure CLI knowledge.

**Estimated Time:** 1-2 hours (first deployment)

---

## Prerequisites

- [ ] Azure CLI installed: `az --version`
- [ ] Logged into Azure: `az login`
- [ ] Node.js 20.x installed: `node --version`
- [ ] Git repository access
- [ ] Azure subscription with permissions to create resources

---

## Overview

We will deploy:
1. **Azure PostgreSQL Flexible Server** - Database
2. **Azure App Service (API)** - Backend tRPC server
3. **Azure App Service (Web)** - Next.js frontend
4. **Run migrations and seed** - Create tables and test data

**No Azure AD B2C needed** - We're using dev-mode authentication.

---

## PART 1: Provision Azure Infrastructure (One-Time)

### Step 1.1: Set Variables

Open PowerShell or Bash and set these variables:

```bash
# Edit these values
RESOURCE_GROUP="rg-church-platform-staging"
LOCATION="eastus2"
DB_NAME="church-db-staging"
DB_ADMIN_USER="churchadmin"
DB_ADMIN_PASSWORD="YourStrongPassword123!"  # Change this!
API_APP_NAME="church-platform-api-staging"
WEB_APP_NAME="church-platform-web-staging"
SUBSCRIPTION_ID="your-subscription-id-here"

# Set active subscription
az account set --subscription $SUBSCRIPTION_ID
```

### Step 1.2: Create Resource Group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags Environment=Staging Project=ChurchPlatform
```

**Expected output:** `"provisioningState": "Succeeded"`

---

### Step 1.3: Create PostgreSQL Flexible Server

```bash
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 14 \
  --public-access 0.0.0.0-255.255.255.255 \
  --tags Environment=Staging
```

**Time:** ~5-10 minutes

**Note:** We're using public access for staging. For production, use private endpoints or VNet integration.

### Step 1.4: Create Database

```bash
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_NAME \
  --database-name elder_first
```

### Step 1.5: Get Database Connection String

```bash
# Build connection string
DB_HOST="${DB_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_HOST}:5432/elder_first?sslmode=require"

echo "DATABASE_URL: $DATABASE_URL"
# SAVE THIS - you'll need it later
```

---

### Step 1.6: Create App Service Plan

```bash
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name "asp-church-platform-staging" \
  --location $LOCATION \
  --sku B1 \
  --is-linux \
  --tags Environment=Staging
```

**Time:** ~2 minutes

---

### Step 1.7: Create API App Service

```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "asp-church-platform-staging" \
  --name $API_APP_NAME \
  --runtime "NODE:20-lts" \
  --tags Environment=Staging Component=API
```

**Expected URL:** `https://${API_APP_NAME}.azurewebsites.net`

---

### Step 1.8: Create Web App Service

```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan "asp-church-platform-staging" \
  --name $WEB_APP_NAME \
  --runtime "NODE:20-lts" \
  --tags Environment=Staging Component=Frontend
```

**Expected URL:** `https://${WEB_APP_NAME}.azurewebsites.net`

---

## PART 2: Configure App Settings

### Step 2.1: Configure API App Settings

```bash
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="$DATABASE_URL" \
    DATABASE_SSL=true \
    ALLOWED_ORIGINS="https://${WEB_APP_NAME}.azurewebsites.net" \
    LOG_LEVEL=info \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### Step 2.2: Configure Web App Settings

Generate a NextAuth secret:
```bash
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
```

Set web app settings:
```bash
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --settings \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL="https://${API_APP_NAME}.azurewebsites.net" \
    NEXTAUTH_URL="https://${WEB_APP_NAME}.azurewebsites.net" \
    NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
    DEV_MODE=true \
    NEXT_PUBLIC_DEV_MODE=true \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

**CRITICAL:** `DEV_MODE=true` enables dev-mode authentication with hardcoded users.

---

## PART 3: Deploy Applications

### Option A: Deploy via Azure CLI (Simplest)

#### Step 3.1: Build and Deploy API

```bash
# From repository root
cd apps/api

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Create deployment package
zip -r api-deploy.zip dist package.json package-lock.json

# Deploy to Azure
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --src-path api-deploy.zip \
  --type zip

cd ../..
```

**Time:** ~5-10 minutes

#### Step 3.2: Build and Deploy Web

```bash
# From repository root
cd apps/web

# Install dependencies
npm ci

# Build Next.js (production mode)
npm run build

# Create deployment package
zip -r web-deploy.zip .next public package.json package-lock.json next.config.js

# Deploy to Azure
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --src-path web-deploy.zip \
  --type zip

cd ../..
```

**Time:** ~5-10 minutes

---

### Option B: Deploy via GitHub Actions (Recommended for CI/CD)

**Prerequisites:**
- GitHub repository with code pushed
- GitHub Actions workflows exist (`.github/workflows/deploy-staging.yml`)

#### Step 3.3: Set GitHub Secrets

Go to: `https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions`

Add these secrets:
- `AZURE_WEBAPP_PUBLISH_PROFILE_API_STAGING` - Download from Azure Portal for API app
- `AZURE_WEBAPP_PUBLISH_PROFILE_WEB_STAGING` - Download from Azure Portal for Web app

To get publish profiles:
```bash
# API publish profile
az webapp deployment list-publishing-profiles \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --xml > api-publish-profile.xml

# Web publish profile
az webapp deployment list-publishing-profiles \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --xml > web-publish-profile.xml
```

Copy the XML contents into GitHub secrets.

#### Step 3.4: Trigger Deployment

```bash
# Push to staging branch or manually trigger workflow
git push origin main

# Or manually trigger via GitHub CLI
gh workflow run deploy-staging.yml
```

---

## PART 4: Run Database Migrations and Seed

### Step 4.1: Set Local Environment for Remote DB

Create `packages/database/.env.staging` (DO NOT commit this):

```bash
DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_HOST}:5432/elder_first?sslmode=require"
```

### Step 4.2: Run Migrations Against Azure DB

```bash
cd packages/database

# Load staging env
export $(cat .env.staging | xargs)

# Run migrations
npm run migrate

# Verify migrations ran
# You should see output: "✓ Ran migration: 001_initial.sql", etc.
```

**Expected migrations:**
- 001_initial.sql (core tables)
- 002_people.sql
- 003_events.sql
- 004_bulletins.sql
- 005_sermons_and_gratitude.sql
- 006_page_protection.sql (if exists)

### Step 4.3: Run Seed Script

**CRITICAL:** This creates the "First Test Church" tenant with ID `00000000-0000-0000-0000-000000000001`.

```bash
# Still in packages/database with .env.staging loaded
npm run seed
```

**Expected output:**
```
Starting database seed...
✓ Created tenant: First Test Church (00000000-0000-0000-0000-000000000001)
✓ Created household: ...
✓ Created person: John Smith
✓ Created person: Jane Smith
... (12 people total)
✓ Created brand pack
✓ Created bulletin for Sun ...
✓ Created 9 service items
✓ Created 3 announcements
✓ Created default fund
✓ Created 2 sermon series
✓ Created 4 sermons
✓ Linked sermon to service item
✓ Created 3 events
✓ Created 6 donations
✓ Created 3 thank-you notes

✓ Database seeded successfully!
```

**If seed fails:** Check DATABASE_URL is correct and PostgreSQL allows your IP.

---

## PART 5: Verify Deployment

### Step 5.1: Test API Health

```bash
curl https://${API_APP_NAME}.azurewebsites.net/health

# Expected: {"status":"ok"}
```

### Step 5.2: Test Web App Login

1. Open browser: `https://${WEB_APP_NAME}.azurewebsites.net`
2. You should see the login page with **yellow dev-mode banner**
3. Try logging in:
   - Email: `pastor@testchurch.local`
   - Password: `test123`
4. Should redirect to dashboard
5. Dashboard should show "First Test Church" data

### Step 5.3: Quick Smoke Test

From the dashboard:
- Click **Sermons** → Should see 4 seeded sermons
- Click **Thank-You Notes** → Should see 3 notes
- Click **Bulletins** → Should see next Sunday's bulletin
- Open bulletin → Click sermon link → Should navigate to sermon detail

**If any step fails, check:**
- Azure App Service logs: `az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP`
- App settings are correct
- Database connection is working

---

## PART 6: Give Pastor Access

### Step 6.1: Prepare Test Credentials

**URL:** `https://${WEB_APP_NAME}.azurewebsites.net`

**Login Credentials:**
- Email: `pastor@testchurch.local`
- Password: `test123`

**Test Script:** Send the pastor `docs/ops/PASTOR-FIRST-TEST-SCRIPT.md` (updated with real URL)

### Step 6.2: Update Test Script

Edit `docs/ops/PASTOR-FIRST-TEST-SCRIPT.md`:
- Replace `[YOUR_APP_URL]` with actual staging URL
- Replace `[Ask your developer for password]` with `test123`

### Step 6.3: Email Template

```
Subject: Church Platform - Ready for Testing

Hi [Pastor Name],

The church platform is now ready for you to test! Here's what you need:

URL: https://church-platform-web-staging.azurewebsites.net
Email: pastor@testchurch.local
Password: test123

Please follow the attached test script (PASTOR-FIRST-TEST-SCRIPT.md) and let me know:
1. What felt confusing or unclear
2. What you liked
3. Any bugs or issues you encountered

This should take about 20-30 minutes. Feel free to click around beyond the script!

Note: This is a test environment with sample data. Your login uses a temporary dev account (not the final Microsoft login experience).

Thanks for your help testing!
```

---

## Troubleshooting

### Problem: "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME

# Add your IP if needed
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_NAME \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

### Problem: "Dev mode banner not showing"

**Solution:**
- Check `NEXT_PUBLIC_DEV_MODE=true` is set in Web App Settings
- Rebuild and redeploy web app (environment variables are baked into Next.js build)

### Problem: "Invalid email or password" for pastor@testchurch.local

**Solution:**
- Check `DEV_MODE=true` is set in Web App Settings
- Verify `apps/web/src/auth.ts` has the pastor dev user (should be committed)
- Redeploy web app

### Problem: "Dashboard shows no data"

**Solution:**
- Check seed script ran successfully
- Verify tenantId in seed matches auth user: `00000000-0000-0000-0000-000000000001`
- Check RLS policies allow access for this tenant

### Problem: App Service shows "Application Error"

**Solution:**
```bash
# View real-time logs
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME

# Check startup command (for API)
az webapp config show \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --query "appCommandLine"

# Should be: "node dist/index.js" for API
```

---

## Cost Estimate

**Monthly cost for staging environment:**
- PostgreSQL Flexible Server (B2s): ~$25-30/month
- App Service Plan (B1): ~$13/month
- **Total: ~$38-43/month**

**To minimize costs:**
- Use B1 tier (not P-series)
- Stop/deallocate when not actively testing
- Delete staging resources when done with first pastor test

**Delete everything:**
```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

---

## Next Steps After Successful Deployment

1. ✅ Verify login works with pastor@testchurch.local
2. ✅ Complete smoke test yourself
3. ✅ Update PASTOR-FIRST-TEST-SCRIPT.md with actual URL
4. ✅ Send credentials and test script to pastor
5. ⏳ Wait for pastor feedback
6. ⏳ Iterate based on feedback
7. ⏳ Plan production deployment with Azure AD B2C

---

## Appendix: Quick Reference Commands

**View API logs:**
```bash
az webapp log tail --name $API_APP_NAME --resource-group $RESOURCE_GROUP
```

**View Web logs:**
```bash
az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

**Restart apps:**
```bash
az webapp restart --name $API_APP_NAME --resource-group $RESOURCE_GROUP
az webapp restart --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

**Update app setting:**
```bash
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings KEY=VALUE
```

**Delete staging environment:**
```bash
az group delete --name $RESOURCE_GROUP --yes
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Contact:** [Your email/Slack]
