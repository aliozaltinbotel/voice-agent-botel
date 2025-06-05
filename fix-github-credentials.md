# 🔧 Fix GitHub Actions Azure Credentials

## Issue
The GitHub Actions deployment is failing with "Invalid client secret provided" error. This means the Azure Service Principal credentials need to be updated.

## Solution

### 1. Update GitHub Repository Secret

1. Go to your GitHub repository: https://github.com/aliozaltinbotel/voice-agent-botel
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Find the existing secret named `AZURE_CREDENTIALS`
4. Click the **pencil icon** to edit it
5. **Replace the entire content** with this new JSON:

```json
{
  "clientId": "5e298bcb-8ea9-4942-86e6-c54742c537c5",
  "clientSecret": "J1C8Q~KLV5dc6YaYYoKeCAOiYP6nzxoRBWt4_bZt",
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

### 2. Important Notes

- ⚠️ **Copy the JSON exactly as shown above** - any extra spaces or line breaks will cause authentication to fail
- ✅ Make sure there are no trailing spaces after the closing `}`
- ✅ The JSON should be on a single line or properly formatted with correct indentation

### 3. Trigger New Deployment

After updating the secret:

1. Go to your repository's **Actions** tab
2. Find the failed workflow run
3. Click **"Re-run all jobs"** 

Or make a small change and push:
```bash
# Make a small change to trigger deployment
echo "# Updated credentials" >> README.md
git add README.md
git commit -m "Trigger deployment with updated credentials"
git push origin main
```

### 4. Verify the Fix

The deployment should now proceed successfully through these stages:
1. ✅ Build and push Docker image
2. ✅ Azure Login (this was failing before)
3. ✅ Deploy to Azure Container Apps

### 5. Expected Result

After successful deployment:
- Your NestJS application will be running on Azure Container Apps
- Health endpoints will be available at:
  - https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/live
  - https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/health/ready
- API documentation at: https://ca-media-worker-dev.blacksea-417b6c91.eastus2.azurecontainerapps.io/api

---

## Troubleshooting

If you still get authentication errors:

1. **Double-check the JSON format** - even a single character error will cause failure
2. **Verify there are no hidden characters** - copy from this document directly
3. **Check the secret name** - it must be exactly `AZURE_CREDENTIALS`

## Security Note

The old service principal has been replaced with a new one, so the previous credentials are no longer valid. This new service principal has the same minimal permissions (Contributor role only on the specific resource group). 