# GitHub Pages Deployment Setup

## Quick Setup

To enable automatic deployment to GitHub Pages, follow these steps:

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository: https://github.com/wissamyah/offloadingTrucks
2. Click on **Settings** tab
3. Scroll down to **Pages** section (in the left sidebar under "Code and automation")
4. Under **Source**, select **GitHub Actions**
5. Click **Save**

### 2. The Workflow is Ready

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml` and will:
- Trigger automatically on every push to the `main` branch
- Build the React application
- Deploy to GitHub Pages

### 3. First Deployment

After enabling GitHub Pages:
1. Either push a commit to the `main` branch, or
2. Go to **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

### 4. Access Your App

Once deployed, your app will be available at:
**https://wissamyah.github.io/offloadingTrucks/**

## Features

- ✅ Automatic deployment on push to main
- ✅ Ignores data.json changes (won't trigger redeploy)
- ✅ Optimized production build
- ✅ Correct base path configured for GitHub Pages

## Manual Deployment

If you need to manually trigger a deployment:
1. Go to the **Actions** tab
2. Select **Deploy to GitHub Pages**
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow**

## Troubleshooting

If deployment fails:
1. Check the Actions tab for error messages
2. Ensure GitHub Pages is set to use **GitHub Actions** as source
3. Verify the repository has the necessary permissions

## Current Configuration

- **Base URL**: `/offloadingTrucks/`
- **Build Output**: `dist/`
- **Node Version**: 20
- **Deployment Branch**: Automated via GitHub Actions (not gh-pages branch)