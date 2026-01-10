#!/bin/bash
#
# AWS S3 + CloudFront deployment provider
#
# Required environment variables:
#   AWS_ACCESS_KEY_ID - AWS access key
#   AWS_SECRET_ACCESS_KEY - AWS secret key
#   AWS_S3_BUCKET - S3 bucket name for static files
#
# Optional environment variables:
#   AWS_REGION - AWS region (default: us-east-1)
#   AWS_CLOUDFRONT_DISTRIBUTION_ID - CloudFront distribution to invalidate
#   BUILD_OUTPUT_DIR - Build output directory (default: dist)
#

# Configuration with defaults
AWS_REGION="${AWS_REGION:-us-east-1}"
BUILD_DIR="${BUILD_OUTPUT_DIR:-dist}"

validate_env() {
    local missing=()

    if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]]; then
        missing+=("AWS_ACCESS_KEY_ID")
    fi

    if [[ -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
        missing+=("AWS_SECRET_ACCESS_KEY")
    fi

    if [[ -z "${AWS_S3_BUCKET:-}" ]]; then
        missing+=("AWS_S3_BUCKET")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "Error: Missing required environment variables:"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
}

check_aws_cli() {
    if ! command -v aws &>/dev/null; then
        echo "Error: AWS CLI not found"
        echo "Install from: https://aws.amazon.com/cli/"
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
    check_aws_cli
    check_build

    local bucket="$AWS_S3_BUCKET"
    if [[ "$env" == "preview" ]]; then
        bucket="${bucket}-preview"
    fi

    echo "==> Deploying to AWS S3"
    echo "    Bucket: $bucket"
    echo "    Region: $AWS_REGION"
    echo "    Build dir: $BUILD_DIR"

    # Sync to S3
    aws s3 sync "$BUILD_DIR" "s3://$bucket" \
        --region "$AWS_REGION" \
        --delete

    # Invalidate CloudFront cache if distribution ID provided
    if [[ -n "${AWS_CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
        echo "==> Invalidating CloudFront cache"
        aws cloudfront create-invalidation \
            --distribution-id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/*"
    fi

    echo "==> AWS deployment successful"
}
