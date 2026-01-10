#!/bin/bash
#
# Cloudflare Pages deployment provider
#
# Required environment variables:
#   CLOUDFLARE_API_TOKEN - API token with Pages deployment permissions
#   CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID
#
# Optional environment variables:
#   CLOUDFLARE_PROJECT_NAME - Pages project name (default: tanks)
#   BUILD_OUTPUT_DIR - Build output directory (default: dist)
#

# Configuration with defaults
PROJECT_NAME="${CLOUDFLARE_PROJECT_NAME:-tanks}"
BUILD_DIR="${BUILD_OUTPUT_DIR:-dist}"

validate_env() {
    local missing=()

    if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
        missing+=("CLOUDFLARE_API_TOKEN")
    fi

    if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
        missing+=("CLOUDFLARE_ACCOUNT_ID")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "Error: Missing required environment variables:"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
}

check_wrangler() {
    if ! command -v wrangler &>/dev/null; then
        echo "Error: wrangler CLI not found"
        echo "Install with: npm install -g wrangler"
        exit 1
    fi
}

check_build() {
    if [[ ! -d "$BUILD_DIR" ]]; then
        echo "Error: Build directory '$BUILD_DIR' not found"
        echo "Run 'npm run build' first"
        exit 1
    fi
}

deploy() {
    local env="$1"

    validate_env
    check_wrangler
    check_build

    echo "==> Deploying to Cloudflare Pages"
    echo "    Project: $PROJECT_NAME"
    echo "    Environment: $env"
    echo "    Build dir: $BUILD_DIR"

    local branch_flag=""
    if [[ "$env" == "preview" ]]; then
        # For preview deployments, use a preview branch
        branch_flag="--branch=preview"
    else
        # Production deployments go to the production branch
        branch_flag="--branch=main"
    fi

    # Deploy using wrangler
    CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
    CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
    wrangler pages deploy "$BUILD_DIR" \
        --project-name="$PROJECT_NAME" \
        $branch_flag

    echo "==> Cloudflare Pages deployment successful"
}
