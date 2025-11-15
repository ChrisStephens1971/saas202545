# Production Deployment Guide - Azure

Complete guide for deploying the Elder-First Church Platform to Microsoft Azure.

## Architecture Overview

**Tech Stack:**
- Frontend: Next.js 14 (React 18, TypeScript)
- Backend API: tRPC on Node.js
- Database: Azure PostgreSQL Flexible Server
- Auth: Azure AD B2C
- Hosting: Azure App Service / Container Apps
- CDN: Azure Front Door
- Storage: Azure Blob Storage
- Monitoring: Application Insights

**Azure Resources:**
```
rg-vrd-202545-prd-eus2-app/
  ├─ app-vrd-202545-prd-eus2-web (Next.js frontend)
  ├─ app-vrd-202545-prd-eus2-api (tRPC API)
  ├─ postgres-vrd-202545-prd-eus2 (PostgreSQL database)
  ├─ kv-vrd-202545-prd-eus2-01 (Key Vault for secrets)
  ├─ stvrd202545prdeus201 (Blob storage for files/PDFs)
  ├─ appi-vrd-202545-prd-eus2 (Application Insights)
  └─ fd-vrd-202545-prd-eus2 (Front Door CDN)
```

## Prerequisites

- Azure subscription
- Azure CLI installed (`az --version`)
- Node.js 18+ and npm
- Git
- Domain name (optional but recommended)

## Step 1: Create Resource Group

```bash
az group create \
  --name rg-vrd-202545-prd-eus2-app \
  --location eastus2 \
  --tags \
    Org=vrd \
    Project=202545 \
    Environment=prd \
    Region=eus2 \
    Owner=ops@verdaio.com \
    CostCenter=202545-llc
```

## Step 2: Create PostgreSQL Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name postgres-vrd-202545-prd-eus2 \
  --location eastus2 \
  --admin-user dbadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --backup-retention 7 \
  --geo-redundant-backup Disabled \
  --high-availability Disabled \
  --public-access 0.0.0.0-255.255.255.255

# Create database
az postgres flexible-server db create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --server-name postgres-vrd-202545-prd-eus2 \
  --database-name elderfirst

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name postgres-vrd-202545-prd-eus2 \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

**Connection String:**
```
postgresql://dbadmin:YourSecurePassword123!@postgres-vrd-202545-prd-eus2.postgres.database.azure.com:5432/elderfirst?sslmode=require
```

## Step 3: Create Key Vault for Secrets

```bash
az keyvault create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name kv-vrd-202545-prd-eus2-01 \
  --location eastus2 \
  --sku standard \
  --enabled-for-deployment true \
  --enabled-for-template-deployment true

# Store database connection string
az keyvault secret set \
  --vault-name kv-vrd-202545-prd-eus2-01 \
  --name "DATABASE-URL" \
  --value "postgresql://dbadmin:YourSecurePassword123!@postgres-vrd-202545-prd-eus2.postgres.database.azure.com:5432/elderfirst?sslmode=require"

# Store NextAuth secret (generate random 32-char string first)
az keyvault secret set \
  --vault-name kv-vrd-202545-prd-eus2-01 \
  --name "NEXTAUTH-SECRET" \
  --value "$(openssl rand -base64 32)"
```

## Step 4: Create Blob Storage for Files

```bash
# Create storage account
az storage account create \
  --name stvrd202545prdeus201 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Create container for bulletins/files
az storage container create \
  --account-name stvrd202545prdeus201 \
  --name bulletins \
  --public-access blob

# Get connection string
az storage account show-connection-string \
  --name stvrd202545prdeus201 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --output tsv

# Store in Key Vault
az keyvault secret set \
  --vault-name kv-vrd-202545-prd-eus2-01 \
  --name "STORAGE-CONNECTION-STRING" \
  --value "<connection-string-from-above>"
```

## Step 5: Build Application

```bash
# Clone repository
git clone https://github.com/yourusername/elder-first-platform.git
cd elder-first-platform

# Install dependencies
npm install

# Build packages
npm run build

# Build frontend
cd apps/web
npm run build

# Build backend API
cd ../api
npm run build
```

## Step 6: Run Database Migrations

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="<your-connection-string>"

# Run migrations
cd packages/database
npm run migrate
```

## Step 7: Deploy Frontend (Next.js)

### Option A: Azure App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name plan-vrd-202545-prd-eus2 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --location eastus2 \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --plan plan-vrd-202545-prd-eus2 \
  --runtime "NODE:18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --settings \
    NODE_ENV=production \
    NEXT_PUBLIC_API_URL=https://app-vrd-202545-prd-eus2-api.azurewebsites.net \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://kv-vrd-202545-prd-eus2-01.vault.azure.net/secrets/DATABASE-URL/)" \
    NEXTAUTH_URL=https://app-vrd-202545-prd-eus2-web.azurewebsites.net \
    NEXTAUTH_SECRET="@Microsoft.KeyVault(SecretUri=https://kv-vrd-202545-prd-eus2-01.vault.azure.net/secrets/NEXTAUTH-SECRET/)"

# Deploy code (from apps/web directory)
cd apps/web
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name app-vrd-202545-prd-eus2-web \
  --src deploy.zip
```

### Option B: Azure Container Apps (Recommended)

```bash
# Create container registry
az acr create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name acrvrd202545prdeus201 \
  --sku Basic

# Build and push Docker image
cd apps/web
az acr build \
  --registry acrvrd202545prdeus201 \
  --image elderfirst-web:latest \
  --file Dockerfile .

# Create Container Apps environment
az containerapp env create \
  --name cae-vrd-202545-prd-eus2 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --location eastus2

# Deploy container app
az containerapp create \
  --name ca-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --environment cae-vrd-202545-prd-eus2 \
  --image acrvrd202545prdeus201.azurecr.io/elderfirst-web:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NODE_ENV=production \
    DATABASE_URL=secretref:database-url \
    NEXTAUTH_SECRET=secretref:nextauth-secret
```

## Step 8: Deploy Backend API

```bash
# Create API App Service
az webapp create \
  --name app-vrd-202545-prd-eus2-api \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --plan plan-vrd-202545-prd-eus2 \
  --runtime "NODE:18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name app-vrd-202545-prd-eus2-api \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://kv-vrd-202545-prd-eus2-01.vault.azure.net/secrets/DATABASE-URL/)"

# Deploy code (from apps/api directory)
cd apps/api
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name app-vrd-202545-prd-eus2-api \
  --src deploy.zip
```

## Step 9: Configure Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app appi-vrd-202545-prd-eus2 \
  --location eastus2 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --application-type web

# Get instrumentation key
az monitor app-insights component show \
  --app appi-vrd-202545-prd-eus2 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --query instrumentationKey -o tsv

# Configure in App Services
az webapp config appsettings set \
  --name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=<key-from-above>
```

## Step 10: Configure Custom Domain (Optional)

```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --hostname www.elderfirstchurch.org

# Bind SSL certificate (using App Service Managed Certificate)
az webapp config ssl create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name app-vrd-202545-prd-eus2-web \
  --hostname www.elderfirstchurch.org

az webapp config ssl bind \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name app-vrd-202545-prd-eus2-web \
  --certificate-thumbprint <thumbprint-from-create> \
  --ssl-type SNI
```

## Step 11: Configure Azure Front Door (CDN)

```bash
# Create Front Door profile
az afd profile create \
  --profile-name fd-vrd-202545-prd-eus2 \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --sku Standard_AzureFrontDoor

# Create endpoint
az afd endpoint create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --profile-name fd-vrd-202545-prd-eus2 \
  --endpoint-name elderfirst \
  --enabled-state Enabled

# Add origin
az afd origin create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --profile-name fd-vrd-202545-prd-eus2 \
  --origin-group-name default-origin-group \
  --origin-name web-origin \
  --host-name app-vrd-202545-prd-eus2-web.azurewebsites.net \
  --origin-host-header app-vrd-202545-prd-eus2-web.azurewebsites.net \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000
```

## Step 12: Set Up CI/CD with GitHub Actions

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy to Azure Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'app-vrd-202545-prd-eus2-web'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: apps/web

      - name: Deploy API to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'app-vrd-202545-prd-eus2-api'
          publish-profile: ${{ secrets.AZURE_API_PUBLISH_PROFILE }}
          package: apps/api
```

## Cost Estimate (Monthly)

| Resource | SKU | Cost |
|----------|-----|------|
| App Service Plan (B1) | 1 vCPU, 1.75GB RAM | ~$13 |
| PostgreSQL Flexible (Burstable B1ms) | 1 vCPU, 2GB RAM, 32GB storage | ~$15 |
| Storage Account (Standard LRS) | 50GB + transactions | ~$2 |
| Key Vault | 10k operations | ~$0.03 |
| Application Insights | 5GB data ingestion | ~$12 |
| Front Door (Standard) | 100GB data transfer | ~$35 |
| **Total Estimated Cost** | | **~$77/month** |

**Scaling options:**
- For 1,000+ concurrent users: Upgrade to S1 ($70/month) or P1V2 ($80/month)
- For high availability: Add second region (+100% cost)

## Security Checklist

- ✅ All secrets stored in Azure Key Vault
- ✅ HTTPS enforced on all endpoints
- ✅ PostgreSQL requires SSL connections
- ✅ Network Security Groups configured
- ✅ Managed identities enabled for App Services
- ✅ Azure AD B2C authentication configured
- ✅ Regular backups enabled (7-day retention)
- ✅ Application Insights monitoring active
- ✅ Azure DDoS Protection (if using Front Door Premium)

## Monitoring & Alerts

```bash
# Create alert for high CPU usage
az monitor metrics alert create \
  --name "High CPU Alert" \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --scopes /subscriptions/<subscription-id>/resourceGroups/rg-vrd-202545-prd-eus2-app/providers/Microsoft.Web/sites/app-vrd-202545-prd-eus2-web \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group-id <action-group-id>

# Create alert for failed requests
az monitor metrics alert create \
  --name "High Error Rate Alert" \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --scopes /subscriptions/<subscription-id>/resourceGroups/rg-vrd-202545-prd-eus2-app/providers/Microsoft.Web/sites/app-vrd-202545-prd-eus2-web \
  --condition "avg Http5xx > 10" \
  --window-size 5m
```

## Backup & Disaster Recovery

```bash
# Enable automated backups
az postgres flexible-server backup create \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name postgres-vrd-202545-prd-eus2 \
  --backup-name manual-backup-$(date +%Y%m%d)

# Configure geo-redundant storage (for critical deployments)
az postgres flexible-server update \
  --resource-group rg-vrd-202545-prd-eus2-app \
  --name postgres-vrd-202545-prd-eus2 \
  --geo-redundant-backup Enabled
```

## Troubleshooting

### App won't start

```bash
# Check logs
az webapp log tail \
  --name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app

# Check environment variables
az webapp config appsettings list \
  --name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app
```

### Database connection errors

```bash
# Test connection from App Service
az webapp ssh \
  --name app-vrd-202545-prd-eus2-web \
  --resource-group rg-vrd-202545-prd-eus2-app

# Inside SSH session
psql "$DATABASE_URL"
```

## Further Reading

- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure PostgreSQL Documentation](https://learn.microsoft.com/en-us/azure/postgresql/)
- [Azure Front Door Documentation](https://learn.microsoft.com/en-us/azure/frontdoor/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
