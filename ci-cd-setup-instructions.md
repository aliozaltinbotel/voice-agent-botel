# 🚀 CI/CD Setup Instructions - Botel Voice Agent

## Current Status ✅

Your Azure Container App infrastructure is deployed and running:
- **Container App**: `ca-media-worker-dev` 
- **URL**: `https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io`
- **Status**: Running (temporary Node.js container)
- **GitHub Repository**: `https://github.com/aliozaltinbotel/voice-agent-botel`

## 📋 Setup Steps

### 1. Configure GitHub Repository Secrets

1. Go to your GitHub repository: https://github.com/aliozaltinbotel/voice-agent-botel
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Create a secret named: `AZURE_CREDENTIALS`
5. Copy and paste this JSON as the secret value:

```json
{
  "clientId": "e63f2552-743a-4a99-9031-ced786fa76c6",
  "clientSecret": "K3F8Q~Yi5WRMZ6tj2HBks.uC4BnOG4fwo FKgFaLk",
  "subscriptionId": "25e4a027-53b5-408e-bf95-adce3c4aa503",
  "tenantId": "fbb83cbf-ab23-4586-88b9-fcd26908b707",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### 2. Verify GitHub Actions Workflow

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`. It will:
- ✅ Build the Docker image from your NestJS application
- ✅ Push it to GitHub Container Registry (ghcr.io)
- ✅ Deploy it to Azure Container Apps automatically

### 3. Trigger Deployment

Once the secret is added:
1. Make any small change to your code (e.g., update a comment)
2. Commit and push to the `main` or `master` branch:
   ```bash
   git add .
   git commit -m "Trigger CI/CD deployment"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub to watch the deployment progress

### 4. Monitor Deployment

You can monitor the deployment in several ways:

#### GitHub Actions
- Go to your repo > **Actions** tab
- Watch the "Deploy to Azure Container Apps" workflow

#### Azure CLI
```bash
# Check revision status
az containerapp revision list --name ca-media-worker-dev --resource-group rg-botel-voice-v2-dev -o table

# View logs
az containerapp logs show --name ca-media-worker-dev --resource-group rg-botel-voice-v2-dev --follow
```

#### Azure Portal
- Navigate to your Container App in the Azure Portal
- Check the **Revisions and replicas** section

## 🔍 Verification Steps

After deployment completes:

1. **Check Health Endpoints**:
   ```bash
   curl https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/live
   curl https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/ready
   ```

2. **Check API Documentation**:
   - Visit: https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/api

3. **Verify Container Image**:
   ```bash
   az containerapp show --name ca-media-worker-dev --resource-group rg-botel-voice-v2-dev --query "properties.template.containers[0].image" -o tsv
   ```
   Should show: `ghcr.io/aliozaltinbotel/voice-agent-botel:latest`

## 🚀 Automated Deployments

Once setup is complete:
- ✅ Every commit to `main`/`master` triggers automatic deployment
- ✅ New container images are built and pushed to GitHub Container Registry
- ✅ Azure Container App is automatically updated with the new image
- ✅ Zero-downtime deployments with health checks

## 🛠️ Manual Deployment (Alternative)

If you need to deploy manually without CI/CD:

```bash
# Update with specific image tag
az containerapp update \
  --name ca-media-worker-dev \
  --resource-group rg-botel-voice-v2-dev \
  --image ghcr.io/aliozaltinbotel/voice-agent-botel:latest
```

## 📊 Environment Variables

Your container app is already configured with all necessary environment variables:
- `VOICE_LIVE_ENABLED=true`
- `VOICE_LIVE_ENDPOINT` (Azure Speech Service)
- `ACS_CONNECTION_STRING` (from Key Vault)
- `COSMOS_ENDPOINT` and `COSMOS_KEY` (from Key Vault)
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- All other required configuration

## 🔐 Security Notes

- ✅ Azure Service Principal has minimal permissions (Contributor on resource group only)
- ✅ Secrets are stored in Azure Key Vault and referenced securely
- ✅ GitHub Container Registry uses GitHub token authentication
- ✅ Container runs as non-root user for security

## 🎯 Next Steps

After deployment is working:
1. Test your Voice AI endpoints
2. Configure phone numbers in Azure Communication Services
3. Set up monitoring and alerting
4. Review and optimize performance settings

---

**🚀 You're all set!** Your continuous deployment pipeline is ready to deploy your current code to Azure Container Apps automatically. 