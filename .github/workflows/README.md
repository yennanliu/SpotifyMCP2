# GitHub Actions Workflows

This directory contains CI/CD workflows for the Spotify MCP Server project.

## Workflows

### 📄 GitHub Pages Deployment (`pages.yml`)

Deploys project documentation to GitHub Pages.

**Triggers:**
- Every push to `main`
- Manual workflow dispatch

**Purpose:**
- Hosts a beautiful documentation site at https://yennanliu.github.io/SpotifyMCP2/
- Automatically updates on every push to main
- Provides easy access to all project documentation

**Features:**
- Professional landing page with project overview
- Links to all documentation (README, SETUP, ARCHITECTURE, etc.)
- Quick start guide
- MCP tools reference
- Project statistics and badges
- Responsive design

**Setup (One-time):**
1. Go to repository Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Save

The site will automatically deploy after the next push to main.

**Permissions:**
- `contents: read` - Read repository files
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - Authenticate deployment

### 🔄 CI Workflow (`ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Test**: Runs tests on multiple Node.js versions (18.x, 20.x, 22.x) and OS platforms (Ubuntu, macOS, Windows)
  - Install dependencies
  - Run linter
  - Run unit tests
  - Generate coverage reports
  - Upload to Codecov
  - Build TypeScript
  - Run MCP protocol tests
  - Run tool call tests

- **Build Artifacts**: Creates distribution packages
  - Creates tarball of built files
  - Uploads as GitHub artifact

- **Code Quality**: Runs quality checks
  - TypeScript compilation check
  - Package vulnerability audit
  - Lists outdated packages

- **Integration Test**: Full integration test suite
  - Runs all tests together

**Matrix Testing:**
- Node.js: 18.x, 20.x, 22.x
- OS: ubuntu-latest, macos-latest, windows-latest
- Total: 9 test configurations

### 🚀 Release Workflow (`release.yml`)

Triggers when a new version tag is pushed (e.g., `v1.0.0`).

**Steps:**
1. Checkout code
2. Install dependencies
3. Run tests
4. Build project
5. Create distribution packages (.tar.gz and .zip)
6. Generate changelog from git commits
7. Create GitHub Release with artifacts
8. (Optional) Publish to npm

**To create a release:**
```bash
git tag v1.0.1
git push origin v1.0.1
```

### 🔒 CodeQL Security Scan (`codeql.yml`)

Runs security analysis on the codebase.

**Triggers:**
- Every push to `main`
- Pull requests to `main`
- Weekly on Mondays at 2 AM UTC

**Analysis:**
- Scans JavaScript/TypeScript code
- Uses security-extended and security-and-quality queries
- Reports findings to GitHub Security tab

### 📦 Dependency Review (`dependency-review.yml`)

Reviews dependencies in pull requests for security issues.

**Features:**
- Fails on moderate or higher severity vulnerabilities
- Denies GPL-3.0 and AGPL-3.0 licenses
- Comments summary in PR

## Dependabot Configuration

**File:** `dependabot.yml`

**Features:**
- Weekly dependency updates (Mondays at 9 AM)
- Groups patch and minor updates
- Updates npm packages and GitHub Actions
- Auto-assigns to repository owner

## Issue Templates

### Bug Report
Use for reporting bugs and issues.

**Location:** `.github/ISSUE_TEMPLATE/bug_report.md`

### Feature Request
Use for suggesting new features.

**Location:** `.github/ISSUE_TEMPLATE/feature_request.md`

## Pull Request Template

**Location:** `.github/PULL_REQUEST_TEMPLATE.md`

Provides a checklist for PR authors:
- Description of changes
- Type of change
- Testing checklist
- Code quality checklist

## Badges

The following badges are displayed in README.md:

- [![CI](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/ci.yml/badge.svg)](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/ci.yml) - CI workflow status
- [![CodeQL](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/codeql.yml/badge.svg)](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/codeql.yml) - Security scan status
- [![Pages](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/pages.yml/badge.svg)](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/pages.yml) - GitHub Pages deployment status
- ![License](https://img.shields.io/badge/License-MIT-yellow.svg) - Project license
- ![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen) - Node.js version requirement
- ![TypeScript](https://img.shields.io/badge/TypeScript-5.4.3-blue) - TypeScript version

## Local Testing

Before pushing, you can run the same checks locally:

```bash
# Linting
npm run lint

# Unit tests
npm test

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration

# Build
npm run build
```

## Secrets Required

### For Codecov (Optional)
- `CODECOV_TOKEN`: Get from https://codecov.io/

### For npm Publishing (Optional)
- `NPM_TOKEN`: Get from https://www.npmjs.com/

Add secrets in: Repository Settings → Secrets and variables → Actions

## Workflow Status

View workflow runs:
- GitHub repo → Actions tab
- See all runs, logs, and artifacts

## Contributing

When contributing:
1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests locally
5. Push and create a pull request
6. Wait for CI to pass
7. Request review

All pull requests must pass CI checks before merging.
