# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment setup for the Spotify MCP Server project.

## Overview

The project uses **GitHub Actions** for automated testing, building, security scanning, and releases.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** Push and Pull Request to `main` and `develop` branches

**Purpose:** Ensure code quality, run tests, and verify builds across multiple environments.

#### Jobs

##### Test Matrix
Runs on **9 different configurations**:
- Node.js versions: 18.x, 20.x, 22.x
- Operating systems: Ubuntu, macOS, Windows

**Steps:**
1. Checkout code
2. Setup Node.js with caching
3. Install dependencies (`npm ci`)
4. Run linter (`npm run lint`)
5. Run unit tests (`npm test`)
6. Generate coverage report
7. Upload coverage to Codecov (Ubuntu + Node 20 only)
8. Build TypeScript (`npm run build`)
9. Test MCP protocol (`npm run test:mcp`)
10. Test tool calls (`npm run test:tool-call`)

##### Build Artifacts
**Runs on:** Ubuntu + Node 20.x (after tests pass)

**Creates:**
- Distribution package with compiled code
- Tarball archive (`spotify-mcp-server.tar.gz`)
- Uploaded to GitHub (30-day retention)

##### Code Quality
**Runs on:** Ubuntu + Node 20.x

**Checks:**
- TypeScript compilation errors
- Package vulnerabilities (`npm audit`)
- Outdated packages (`npm outdated`)

##### Integration Tests
**Runs on:** Ubuntu + Node 20.x (after tests pass)

**Runs:** Full integration test suite

### 2. Release Workflow (`.github/workflows/release.yml`)

**Trigger:** Git tag push (pattern: `v*.*.*`)

**Purpose:** Create GitHub releases with downloadable artifacts.

#### Steps

1. **Validate:** Run full test suite
2. **Build:** Compile TypeScript
3. **Package:** Create distribution archives
   - `.tar.gz` for Linux/macOS
   - `.zip` for Windows
4. **Changelog:** Auto-generate from commits
5. **Release:** Create GitHub release with artifacts
6. **Publish:** (Optional) Publish to npm

#### Creating a Release

```bash
# Update version in package.json
npm version patch  # or minor, or major

# Create and push tag
git tag v1.0.1
git push origin v1.0.1

# GitHub Actions will automatically:
# - Run tests
# - Build the project
# - Create release with artifacts
```

### 3. CodeQL Security Scan (`.github/workflows/codeql.yml`)

**Trigger:**
- Push to `main`
- Pull requests to `main`
- Weekly schedule (Mondays at 2 AM UTC)

**Purpose:** Automated security vulnerability detection.

#### Features
- **Language:** JavaScript/TypeScript
- **Queries:** Security-extended + Security-and-quality
- **Results:** Published to GitHub Security tab
- **Alerts:** Email notifications for new vulnerabilities

### 4. Dependency Review (`.github/workflows/dependency-review.yml`)

**Trigger:** Pull requests to `main` and `develop`

**Purpose:** Review dependency changes for security risks.

#### Features
- Fails PR if moderate+ severity vulnerabilities found
- Blocks GPL-3.0 and AGPL-3.0 licenses
- Comments summary in PR

### 5. GitHub Pages Deployment (`.github/workflows/pages.yml`)

**Trigger:**
- Push to `main` branch
- Manual workflow dispatch

**Purpose:** Deploy project documentation to GitHub Pages.

#### Features
- **Automated Deployment**: Builds and deploys on every push to main
- **Beautiful Documentation Site**: Professional landing page with all project info
- **Live Site**: Accessible at `https://yennanliu.github.io/SpotifyMCP2/`

#### Build Process
1. Checkout code
2. Generate HTML documentation site
3. Configure GitHub Pages
4. Upload artifact
5. Deploy to Pages

#### Documentation Site Includes
- **Project Overview**: Description, badges, and features
- **Quick Start Guide**: Step-by-step setup instructions
- **MCP Tools Reference**: All 8 tools documented
- **Links to Documentation**: README, SETUP, ARCHITECTURE, CI/CD guides
- **Project Statistics**: Test coverage, code metrics
- **Development Info**: Build commands, testing instructions

#### Accessing the Site

**Live URL**: https://yennanliu.github.io/SpotifyMCP2/

The site is automatically updated when you push to the main branch.

#### Permissions Required

The Pages workflow needs these permissions (already configured):
- `contents: read` - Read repository files
- `pages: write` - Deploy to Pages
- `id-token: write` - Authenticate deployment

#### Setup GitHub Pages (One-time)

1. Go to repository Settings
2. Navigate to Pages (left sidebar)
3. Under "Source", select "GitHub Actions"
4. Save

The site will deploy automatically after the next push to main.

## Dependabot

**File:** `.github/dependabot.yml`

**Configuration:**
- **Schedule:** Weekly updates (Mondays at 9 AM)
- **Ecosystems:** npm packages + GitHub Actions
- **Grouping:** Patches and minor updates grouped separately
- **Labels:** `dependencies`, `automated`
- **Auto-assign:** Repository owner

**PR Limits:** Max 10 open PRs

## Status Badges

Added to `README.md`:

```markdown
[![CI](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/ci.yml/badge.svg)](...)
[![CodeQL](https://github.com/yennanliu/SpotifyMCP2/actions/workflows/codeql.yml/badge.svg)](...)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](...)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](...)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.3-blue)](...)
```

## Templates

### Issue Templates

**Bug Report** (`.github/ISSUE_TEMPLATE/bug_report.md`)
- Environment details
- Reproduction steps
- Expected vs actual behavior
- Logs and screenshots

**Feature Request** (`.github/ISSUE_TEMPLATE/feature_request.md`)
- Problem statement
- Proposed solution
- Use cases
- Implementation ideas

### Pull Request Template

**File:** `.github/PULL_REQUEST_TEMPLATE.md`

**Sections:**
- Description
- Type of change
- Changes made
- Testing checklist
- Code quality checklist

## Local CI Testing

Run the same checks locally before pushing:

```bash
# Install dependencies
npm ci

# Lint check
npm run lint

# Run tests
npm test

# Coverage report
npm run test:coverage

# Build
npm run build

# MCP protocol test
npm run test:mcp

# Tool call test
npm run test:tool-call

# Full integration
npm run test:integration
```

## Secrets Configuration

### Required Secrets

**For Codecov (Optional):**
1. Sign up at https://codecov.io/
2. Get repository token
3. Add as `CODECOV_TOKEN` in GitHub Secrets

**For npm Publishing (Optional):**
1. Get npm token from https://www.npmjs.com/
2. Add as `NPM_TOKEN` in GitHub Secrets

### Adding Secrets

1. Go to repository settings
2. Navigate to: Secrets and variables → Actions
3. Click "New repository secret"
4. Add secret name and value

## Workflow Permissions

### Default Permissions
- `contents: read` - Read repository contents
- `actions: read` - Read action results

### Additional Permissions (per workflow)
- **Release:** `contents: write` - Create releases
- **CodeQL:** `security-events: write` - Write security alerts
- **Dependency Review:** `pull-requests: write` - Comment on PRs
- **GitHub Pages:** `pages: write`, `id-token: write` - Deploy to Pages

## Monitoring

### View Workflow Runs
1. Go to repository on GitHub
2. Click "Actions" tab
3. Select workflow to view runs
4. Click on run to see logs

### Viewing Artifacts
1. Go to workflow run
2. Scroll to "Artifacts" section
3. Download artifacts

### Security Alerts
1. Go to "Security" tab
2. Navigate to "Code scanning alerts"
3. View CodeQL findings

## Best Practices

### For Contributors
1. ✅ Run tests locally before pushing
2. ✅ Keep commits focused and atomic
3. ✅ Write meaningful commit messages
4. ✅ Update tests for new features
5. ✅ Wait for CI to pass before requesting review

### For Maintainers
1. ✅ Review Dependabot PRs weekly
2. ✅ Monitor security alerts
3. ✅ Update workflows as needed
4. ✅ Keep dependencies up to date
5. ✅ Create releases regularly

## Troubleshooting

### CI Failing on Windows
- **Issue:** Line endings (CRLF vs LF)
- **Solution:** Add `.gitattributes` file

### Tests Pass Locally but Fail in CI
- **Issue:** Environment differences
- **Solution:** Check Node.js version, OS-specific paths

### Artifacts Not Uploading
- **Issue:** Path not found
- **Solution:** Verify build output directory exists

### CodeQL Timing Out
- **Issue:** Large codebase
- **Solution:** Increase timeout or exclude paths

### Dependabot Not Creating PRs
- **Issue:** Configuration error or PR limit reached
- **Solution:** Check dependabot.yml syntax, close old PRs

## Performance Optimization

### Caching
- ✅ npm dependencies cached automatically
- ✅ Uses `actions/setup-node@v4` with `cache: 'npm'`

### Parallel Execution
- ✅ Matrix strategy runs jobs in parallel
- ✅ Different jobs run concurrently

### Conditional Steps
- ✅ Coverage upload only on Ubuntu + Node 20
- ✅ MCP tests skip on Windows (script compatibility)

## Cost Optimization

**GitHub Actions Free Tier:**
- Public repos: Unlimited minutes
- Private repos: 2,000 minutes/month

**Current Usage:**
- ~15 minutes per CI run
- ~133 runs/month = ~2,000 minutes/month

**Optimizations:**
- Use matrix sparingly
- Skip redundant jobs
- Cache dependencies
- Use self-hosted runners (if needed)

## Future Enhancements

### Completed
- [x] **GitHub Pages Documentation** - Live project site
- [x] Automated deployment on push to main
- [x] Professional documentation landing page

### Planned
- [ ] Automated changelog generation
- [ ] Performance benchmarking
- [ ] Docker image builds
- [ ] Deployment to package registries
- [ ] E2E testing with real Spotify API (manual trigger)
- [ ] Coverage trending reports
- [ ] Slack/Discord notifications

### Optional
- [ ] Semantic versioning automation
- [ ] License compliance checks
- [ ] Code coverage enforcement (fail below threshold)
- [ ] Automated documentation deployment
- [ ] Integration with other CI platforms

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [npm CI vs npm install](https://docs.npmjs.com/cli/v8/commands/npm-ci)

## Support

For CI/CD issues:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Open an issue with `ci/cd` label
4. Contact maintainers

---

**Last Updated:** 2026-02-21
**Version:** 1.0.0
