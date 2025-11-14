// ============================================================================
// Elder-First Church Platform - Azure Infrastructure (Bicep)
// Version: 1.0
// ============================================================================

// This file defines the complete Azure infrastructure for the Elder-First
// platform following the Verdaio Azure naming standard v1.2.

targetScope = 'subscription'

// ============================================================================
// Parameters
// ============================================================================

@description('Organization code')
param org string = 'vrd'

@description('Project code')
param proj string = '202545'

@description('Environment (dev, stg, prd)')
@allowed(['dev', 'stg', 'prd'])
param env string

@description('Primary region')
param primaryRegion string = 'eus2'

@description('Location for resources')
param location string = 'eastus2'

@description('Tags to apply to all resources')
param tags object = {
  Org: 'vrd'
  Project: '202545'
  Environment: env
  Region: primaryRegion
  Owner: 'ops@verdaio.com'
  CostCenter: '202545-llc'
  ManagedBy: 'bicep'
}

// ============================================================================
// Naming Convention Helper
// ============================================================================

var namingPrefix = '${org}-${proj}-${env}-${primaryRegion}'

// ============================================================================
// Resource Groups
// ============================================================================

resource rgApp 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namingPrefix}-app'
  location: location
  tags: tags
}

resource rgData 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namingPrefix}-data'
  location: location
  tags: tags
}

resource rgNetwork 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namingPrefix}-network'
  location: location
  tags: tags
}

resource rgSecurity 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${namingPrefix}-security'
  location: location
  tags: tags
}

// ============================================================================
// Module: Network Infrastructure
// ============================================================================

module network './modules/network.bicep' = {
  name: 'network-deployment'
  scope: rgNetwork
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
  }
}

// ============================================================================
// Module: Data Services
// ============================================================================

module database './modules/database.bicep' = {
  name: 'database-deployment'
  scope: rgData
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
    subnetId: network.outputs.dataSubnetId
    administratorLogin: 'elderadmin'
    administratorPassword: '@secure parameter - use Key Vault reference'
    skuName: env == 'prd' ? 'Standard_D2ds_v4' : 'Burstable_B1ms'
    storageSizeGB: env == 'prd' ? 256 : 32
  }
}

module redis './modules/redis.bicep' = {
  name: 'redis-deployment'
  scope: rgData
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
    subnetId: network.outputs.dataSubnetId
    skuName: env == 'prd' ? 'Premium' : 'Basic'
    skuFamily: env == 'prd' ? 'P' : 'C'
    skuCapacity: env == 'prd' ? 1 : 0
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage-deployment'
  scope: rgData
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
    containerNames: ['bulletins', 'attachments', 'brand-packs']
  }
}

// ============================================================================
// Module: Application Services
// ============================================================================

module appService './modules/app-service.bicep' = {
  name: 'app-service-deployment'
  scope: rgApp
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
    subnetId: network.outputs.appSubnetId
    skuName: env == 'prd' ? 'P1v3' : 'B1'
    skuTier: env == 'prd' ? 'PremiumV3' : 'Basic'
    enableSlots: env == 'prd'
    appSettings: [
      {
        name: 'NODE_ENV'
        value: env == 'prd' ? 'production' : 'development'
      }
      {
        name: 'DATABASE_URL'
        value: '@Microsoft.KeyVault(SecretUri=${keyVault.outputs.vaultUri}secrets/database-url/)'
      }
      {
        name: 'REDIS_URL'
        value: '@Microsoft.KeyVault(SecretUri=${keyVault.outputs.vaultUri}secrets/redis-url/)'
      }
      {
        name: 'AZURE_STORAGE_CONNECTION_STRING'
        value: '@Microsoft.KeyVault(SecretUri=${keyVault.outputs.vaultUri}secrets/storage-connection-string/)'
      }
    ]
  }
}

module containerApp './modules/container-app.bicep' = {
  name: 'container-app-deployment'
  scope: rgApp
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
    appName: 'render'
    containerImage: 'acr${org}${proj}${env}${primaryRegion}01.azurecr.io/render-service:latest'
    minReplicas: env == 'prd' ? 2 : 1
    maxReplicas: env == 'prd' ? 10 : 3
    cpu: '1.0'
    memory: '2Gi'
    environmentVariables: [
      {
        name: 'AZURE_STORAGE_CONNECTION_STRING'
        secretRef: 'storage-connection-string'
      }
    ]
  }
}

// ============================================================================
// Module: Security (Key Vault)
// ============================================================================

module keyVault './modules/key-vault.bicep' = {
  name: 'key-vault-deployment'
  scope: rgSecurity
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
    tenantId: subscription().tenantId
    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enableRbacAuthorization: true
  }
}

// ============================================================================
// Module: Monitoring (App Insights + Log Analytics)
// ============================================================================

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring-deployment'
  scope: rgApp
  params: {
    namingPrefix: namingPrefix
    location: location
    tags: tags
  }
}

// ============================================================================
// Module: B2C Authentication (Entra External ID)
// ============================================================================

// Note: B2C tenant is created separately (not supported in Bicep)
// App registration can be created via Azure CLI or Portal

// ============================================================================
// Outputs
// ============================================================================

output resourceGroupAppName string = rgApp.name
output resourceGroupDataName string = rgData.name
output appServiceName string = appService.outputs.appServiceName
output appServiceUrl string = appService.outputs.defaultHostname
output containerAppUrl string = containerApp.outputs.containerAppFqdn
output keyVaultName string = keyVault.outputs.keyVaultName
output databaseServerName string = database.outputs.serverName
output storageName string = storage.outputs.storageName
output applicationInsightsKey string = monitoring.outputs.instrumentationKey

// ============================================================================
// Module Files (Separate Files)
// ============================================================================

// The following modules should be in separate .bicep files:
// - modules/network.bicep
// - modules/database.bicep
// - modules/redis.bicep
// - modules/storage.bicep
// - modules/app-service.bicep
// - modules/container-app.bicep
// - modules/key-vault.bicep
// - modules/monitoring.bicep
