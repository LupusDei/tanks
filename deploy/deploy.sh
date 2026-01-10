#!/bin/bash
#
# System-agnostic deployment script
# Delegates to provider-specific implementations based on DEPLOY_PROVIDER env var
#
# Usage:
#   DEPLOY_PROVIDER=cloudflare ./deploy/deploy.sh [preview|production]
#
# Environment variables:
#   DEPLOY_PROVIDER - Required: cloudflare, aws, or gcp
#   Additional provider-specific vars documented in each provider script
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROVIDERS_DIR="$SCRIPT_DIR/providers"

# Default to production deployment
DEPLOY_ENV="${1:-production}"

# Validate deploy environment
if [[ "$DEPLOY_ENV" != "preview" && "$DEPLOY_ENV" != "production" ]]; then
    echo "Error: Invalid deployment environment '$DEPLOY_ENV'"
    echo "Usage: $0 [preview|production]"
    exit 1
fi

# Check for provider
if [[ -z "${DEPLOY_PROVIDER:-}" ]]; then
    echo "Error: DEPLOY_PROVIDER environment variable is required"
    echo "Supported providers: cloudflare, aws, gcp"
    exit 1
fi

PROVIDER_SCRIPT="$PROVIDERS_DIR/${DEPLOY_PROVIDER}.sh"

# Check provider script exists
if [[ ! -f "$PROVIDER_SCRIPT" ]]; then
    echo "Error: Unknown provider '$DEPLOY_PROVIDER'"
    echo "Available providers:"
    for script in "$PROVIDERS_DIR"/*.sh; do
        if [[ -f "$script" ]]; then
            basename "$script" .sh
        fi
    done
    exit 1
fi

echo "==> Deploying to $DEPLOY_PROVIDER ($DEPLOY_ENV)"

# Source and execute provider
source "$PROVIDER_SCRIPT"

# All providers must implement a deploy function
if ! type deploy &>/dev/null; then
    echo "Error: Provider '$DEPLOY_PROVIDER' does not implement deploy function"
    exit 1
fi

# Run the deployment
deploy "$DEPLOY_ENV"

echo "==> Deployment complete"
