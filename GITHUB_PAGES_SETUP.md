# GitHub Pages Setup Guide

## Overview

Your Spotify MCP Server now has a professional documentation site that deploys automatically to GitHub Pages!

**Live URL** (after setup): https://yennanliu.github.io/SpotifyMCP2/

## One-Time Setup (Required)

Follow these steps to enable GitHub Pages for your repository:

### Step 1: Go to Repository Settings

1. Navigate to your repository: https://github.com/yennanliu/SpotifyMCP2
2. Click the **"Settings"** tab (top right of the repository page)

### Step 2: Navigate to Pages

1. In the left sidebar, scroll down to find **"Pages"**
2. Click on **"Pages"**

### Step 3: Configure Build Source

1. Under **"Build and deployment"** section
2. Find **"Source"** dropdown
3. Select **"GitHub Actions"** (NOT "Deploy from a branch")
4. Click **"Save"** (if a save button appears)

**Important**: Make sure you select "GitHub Actions" as the source, not "Deploy from a branch"

### Step 4: Wait for Deployment

1. Go to the **"Actions"** tab: https://github.com/yennanliu/SpotifyMCP2/actions
2. Look for the **"Deploy to GitHub Pages"** workflow
3. It should be running (or already completed)
4. Wait 1-2 minutes for deployment to complete

### Step 5: Verify Deployment

1. Once the workflow shows a green checkmark ✅
2. Visit: https://yennanliu.github.io/SpotifyMCP2/
3. You should see your beautiful documentation site!

## What the Documentation Site Includes

Your live site features:

- **Professional Landing Page**
  - Spotify branding (green gradient)
  - Project overview and description
  - Live CI/CD status badges

- **Quick Start Guide**
  - Step-by-step setup instructions
  - Link to detailed setup guide
  - Quick links to documentation

- **MCP Tools Documentation**
  - All 8 tools listed and described
  - Search, playback, playlist, and device tools

- **Project Information**
  - Documentation links (README, SETUP, ARCHITECTURE, CICD)
  - Development commands
  - Testing information
  - Project statistics

- **Navigation Links**
  - GitHub repository
  - Issue tracker
  - Pull requests
  - CI/CD status
  - Spotify Developer Dashboard
  - MCP Documentation

## Automatic Updates

The site automatically updates when you:
- Push to the `main` branch
- Merge a pull request to `main`

No manual deployment needed!

## Troubleshooting

### "Actions" is not showing in Settings source

**Solution**: You may need to enable GitHub Actions first
1. Go to Settings → Actions → General
2. Under "Actions permissions", select "Allow all actions and reusable workflows"
3. Save, then try setting up Pages again

### Workflow runs but site doesn't appear

**Solution**: Check workflow permissions
1. Go to Settings → Actions → General
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Check "Allow GitHub Actions to create and approve pull requests"
5. Save

### 404 Error when visiting the site

**Solution**: Wait a few more minutes
- First deployment can take 5-10 minutes
- Subsequent deployments are faster (1-2 minutes)
- Check the Actions tab to see if deployment is still running

### Custom domain setup (optional)

If you want to use a custom domain:
1. Go to Settings → Pages
2. Under "Custom domain", enter your domain
3. Configure DNS settings (see GitHub's custom domain guide)

## Monitoring Deployments

### View Deployment Status

1. **Actions Tab**: https://github.com/yennanliu/SpotifyMCP2/actions
2. Click on "Deploy to GitHub Pages" workflow
3. View recent runs and their status

### Deployment Badge

The README now includes a deployment badge:

[![Pages](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/pages.yml/badge.svg)](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/pages.yml)

This shows the current deployment status.

## How It Works

### Workflow Trigger
The Pages workflow runs when:
- You push commits to `main` branch
- You manually trigger it from Actions tab

### Build Process
1. Checkout code from repository
2. Generate HTML documentation site (docs/index.html)
3. Configure GitHub Pages
4. Upload site as artifact
5. Deploy to GitHub Pages

### Deployment
- Uses GitHub's official `deploy-pages` action
- Deploys to `github-pages` environment
- Site becomes available at `https://yennanliu.github.io/SpotifyMCP2/`

## Customization

### Update Site Content

To customize the documentation site, edit:
`.github/workflows/pages.yml` (around line 30-350)

The HTML is embedded in the workflow file for simplicity.

### Add More Pages

To add more pages:
1. Modify the workflow to create additional HTML files
2. Link them from the main index.html
3. Push changes to main

### Styling

The site uses inline CSS for:
- Spotify green theme (#1DB954)
- Purple gradient background
- Responsive card layout
- Mobile-friendly design

## Benefits

✅ **Always Up-to-Date**: Deploys automatically on every push
✅ **Zero Configuration**: No build tools needed
✅ **Fast**: 1-2 minute deployments
✅ **Free**: GitHub Pages is free for public repos
✅ **Professional**: Beautiful, mobile-responsive design
✅ **SEO Friendly**: Better discoverability
✅ **Easy Sharing**: Simple URL to share with users

## Links

- **Live Site**: https://yennanliu.github.io/SpotifyMCP2/
- **Repository**: https://github.com/yennanliu/SpotifyMCP2
- **Workflow File**: `.github/workflows/pages.yml`
- **GitHub Pages Docs**: https://docs.github.com/en/pages

## Support

If you encounter issues:
1. Check the Actions tab for deployment errors
2. Verify Pages is enabled in Settings
3. Ensure workflow has correct permissions
4. Wait 5-10 minutes for first deployment

---

**Note**: After completing the one-time setup, the site will automatically update on every push to main. No further action needed!
