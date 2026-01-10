# Deployment Guide

This project uses a system-agnostic deployment architecture that supports multiple cloud providers.

## Quick Start (Cloudflare Pages)

### Prerequisites

1. A Cloudflare account with Pages enabled
2. Cloudflare API token with Pages permissions
3. Your Cloudflare Account ID

### GitHub Actions (Automatic)

Deployments happen automatically when:
1. Code is pushed to `master`
2. CI workflow passes (build, lint, test)
3. Deploy workflow triggers and pushes to Cloudflare Pages

#### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Cloudflare Pages edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (found in dashboard URL) |

### Manual Deployment

```bash
# Build first
npm run build

# Deploy to Cloudflare (requires wrangler CLI)
npm run deploy:cloudflare

# Or deploy a preview
npm run deploy:preview
```

Required environment variables for manual deployment:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Architecture

### Abstraction Layer

The deployment system uses a provider-agnostic abstraction in `deploy/`:

```
deploy/
├── deploy.sh              # Main entry point
└── providers/
    ├── cloudflare.sh      # Cloudflare Pages
    ├── aws.sh             # AWS S3 + CloudFront
    └── gcp.sh             # Google Cloud Storage
```

### How It Works

1. Set `DEPLOY_PROVIDER` environment variable
2. Run `./deploy/deploy.sh [preview|production]`
3. The script delegates to the appropriate provider

```bash
# Example: Deploy to AWS
DEPLOY_PROVIDER=aws \
AWS_ACCESS_KEY_ID=xxx \
AWS_SECRET_ACCESS_KEY=xxx \
AWS_S3_BUCKET=my-bucket \
./deploy/deploy.sh production
```

## Adding New Providers

1. Create `deploy/providers/<provider>.sh`
2. Implement a `deploy()` function that takes environment as argument
3. Add validation for required environment variables
4. The provider will be automatically available

### Provider Template

```bash
#!/bin/bash
# deploy/providers/newprovider.sh

validate_env() {
    # Check required env vars
}

deploy() {
    local env="$1"  # "preview" or "production"
    validate_env
    # Deploy logic here
}
```

## CI/CD Pipeline

### Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Build, lint, test on push to master |
| `.github/workflows/deploy.yml` | Deploy after successful CI |

### CI Workflow

- Triggers on push to `master` and pull requests
- Skips `bd sync` commits (beads issue tracker)
- Runs: `npm run build`, `npm run lint`, `npm test`

### Deploy Workflow

- Triggers after CI workflow completes successfully
- Only runs on `master` branch
- Uses Cloudflare wrangler-action for deployment

## Provider-Specific Setup

### Cloudflare Pages

1. Create a Pages project named "tanks" in Cloudflare dashboard
2. Generate an API token with Pages permissions
3. Add secrets to GitHub repository

### AWS S3 + CloudFront

Required environment variables:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_CLOUDFRONT_DISTRIBUTION_ID` (optional, for cache invalidation)
- `AWS_REGION` (default: us-east-1)

### Google Cloud Storage

Required environment variables:
- `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON)
- `GCP_BUCKET`
- `GCP_PROJECT_ID` (optional)

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs for errors
2. Verify secrets are set correctly
3. Ensure Cloudflare project exists with correct name

### Build Output Missing

Run `npm run build` locally to verify the build works. The output should be in `dist/`.

### Cache Issues

Cloudflare Pages caches are configured via `public/_headers`:
- Static assets (`/assets/*`): 1 year cache
- HTML: No cache (always fresh)
