# 🔧 GitHub Secret JSON Format Fix

## Issue
Getting "Content is not a valid JSON object" error in GitHub Actions. This means the JSON in the GitHub secret has formatting issues.

## Solution

### Step 1: Delete and Recreate the Secret

1. Go to https://github.com/aliozaltinbotel/voice-agent-botel/settings/secrets/actions
2. Find `AZURE_CREDENTIALS` and click **Delete**
3. Click **New repository secret**
4. Name: `AZURE_CREDENTIALS`

### Step 2: Copy This Exact JSON (Single Line)

**Important: Copy this ENTIRE line as ONE SINGLE LINE with NO line breaks:**

```
{"clientId":"5e298bcb-8ea9-4942-86e6-c54742c537c5","clientSecret":"J1C8Q~KLV5dc6YaYYoKeCAOiYP6nzxoRBWt4_bZt","subscriptionId":"25e4a027-53b5-408e-bf95-adce3c4aa503","tenantId":"fbb83cbf-ab23-4586-88b9-fcd26908b707","activeDirectoryEndpointUrl":"https://login.microsoftonline.com","resourceManagerEndpointUrl":"https://management.azure.com/","activeDirectoryGraphResourceId":"https://graph.windows.net/","sqlManagementEndpointUrl":"https://management.core.windows.net:8443/","galleryEndpointUrl":"https://gallery.azure.com/","managementEndpointUrl":"https://management.core.windows.net/"}
```

### Step 3: Paste Instructions

1. **Select all the text above** (starting with `{` and ending with `}`)
2. **Copy it** (Ctrl+C)
3. **Paste it directly** into the GitHub secret value field
4. **DO NOT press Enter** - it should be one continuous line
5. **DO NOT add any extra spaces** before or after
6. Click **Add secret**

### Step 4: Verify

After adding the secret:
- The secret should show as "AZURE_CREDENTIALS" in your secrets list
- No error messages should appear

### Step 5: Test

1. Go to **Actions** tab in your repository
2. Find the most recent failed workflow
3. Click **"Re-run all jobs"**

## Common Mistakes to Avoid

❌ **Don't do this:**
- Don't format the JSON with line breaks
- Don't add extra spaces
- Don't copy from a formatted JSON viewer
- Don't edit an existing secret (delete and recreate)

✅ **Do this:**
- Copy the single-line JSON exactly as shown above
- Create a new secret (don't edit existing)
- Paste directly without modification

## Expected Result

After fixing the secret, your GitHub Actions should:
1. ✅ Successfully authenticate with Azure
2. ✅ Deploy your container app
3. ✅ Show your NestJS application running

If you still get JSON errors after this, the issue might be with your browser or clipboard. Try:
1. Using a different browser
2. Typing the JSON manually (not recommended but works)
3. Using a text editor to clean the JSON first 