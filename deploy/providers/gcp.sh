#!/bin/bash
#
# Google Cloud Storage deployment provider
#
# Required environment variables:
#   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON key
#   GCP_BUCKET - GCS bucket name for static files
#
# Optional environment variables:
#   GCP_PROJECT_ID - GCP project ID (usually inferred from credentials)
#   BUILD_OUTPUT_DIR - Build output directory (default: dist)
#

# Configuration with defaults
BUILD_DIR="${BUILD_OUTPUT_DIR:-dist}"

validate_env() {
    local missing=()

    if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
        missing+=("GOOGLE_APPLICATION_CREDENTIALS")
    fi

    if [[ -z "${GCP_BUCKET:-}" ]]; then
        missing+=("GCP_BUCKET")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "Error: Missing required environment variables:"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi

    if [[ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
        echo "Error: Credentials file not found: $GOOGLE_APPLICATION_CREDENTIALS"
        exit 1
    fi
}

check_gsutil() {
    if ! command -v gsutil &>/dev/null; then
        echo "Error: gsutil not found"
        echo "Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install"
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
    check_gsutil
    check_build

    local bucket="$GCP_BUCKET"
    if [[ "$env" == "preview" ]]; then
        bucket="${bucket}-preview"
    fi

    echo "==> Deploying to Google Cloud Storage"
    echo "    Bucket: gs://$bucket"
    echo "    Build dir: $BUILD_DIR"

    # Sync to GCS
    gsutil -m rsync -r -d "$BUILD_DIR" "gs://$bucket"

    # Set cache headers for assets
    gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
        "gs://$bucket/assets/**"

    # Set shorter cache for HTML
    gsutil -m setmeta -h "Cache-Control:public, max-age=300" \
        "gs://$bucket/index.html"

    echo "==> GCP deployment successful"
}
