# 🔓 Make GitHub Container Registry Package Public

## Issue
Azure Container Apps cannot pull your image from GitHub Container Registry because it's private and requires authentication.

## Quick Solution: Make the Package Public

### Step 1: Go to Your Repository Packages

1. Go to your GitHub repository: https://github.com/aliozaltinbotel/voice-agent-botel
2. Click on the **"Packages"** tab on the right side of the repository page
3. Or go directly to: https://github.com/aliozaltinbotel/voice-agent-botel/pkgs/container/voice-agent-botel

### Step 2: Change Package Visibility

1. Click on the package name `voice-agent-botel`
2. Click on **"Package settings"** on the right side
3. Scroll down to the **"Danger Zone"** section
4. Click **"Change visibility"**
5. Select **"Public"**
6. Type the package name to confirm: `voice-agent-botel`
7. Click **"I understand the consequences, change package visibility"**

### Step 3: Verify the Change

After making it public:
- The package should show as "Public" in the package settings
- Anyone should be able to pull the image without authentication

### Step 4: Re-run the GitHub Action

1. Go to your repository's **Actions** tab
2. Find the most recent workflow run
3. Click **"Re-run all jobs"**

The deployment should now succeed because Azure Container Apps can pull the public image.

---

## Alternative: Private Registry with Authentication (Advanced)

If you prefer to keep the registry private, you'll need to:

1. **Create a GitHub Personal Access Token**:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create a token with `read:packages` scope

2. **Add it to Azure Container Apps**:
   ```bash
   # Replace YOUR_GITHUB_TOKEN with the actual token
   az containerapp secret set --name ca-media-worker-dev --resource-group rg-botel-voice-v2-dev --secrets github-token="YOUR_GITHUB_TOKEN"
   
   az containerapp registry set --name ca-media-worker-dev --resource-group rg-botel-voice-v2-dev --server ghcr.io --username aliozaltinbotel --password "YOUR_GITHUB_TOKEN"
   ```

## Recommendation

**For development/testing: Use the public approach** - it's simpler and faster.

**For production: Use private registry with proper authentication** - more secure.

Since this is a development environment (`dev`), making the package public is the quickest solution to get your deployment working. 