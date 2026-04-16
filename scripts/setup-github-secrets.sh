#!/bin/bash

# GitHub Secrets Setup Helper
# This script helps configure required secrets for E2E tests CI/CD pipeline
# Run: bash scripts/setup-github-secrets.sh

set -e

echo "🔐 GitHub E2E Tests Secrets Setup"
echo "=================================="
echo ""
echo "This script will help you configure GitHub Secrets for the E2E tests CI/CD pipeline."
echo "You must be authenticated with GitHub CLI. Run: gh auth login"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI not found. Install from: https://cli.github.com/"
  exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated with GitHub. Run: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Prompt for secrets
echo "Enter the following values (press Enter to skip):"
echo ""

read -p "NEXT_PUBLIC_SUPABASE_URL (e.g., https://xxxx.supabase.co): " SUPABASE_URL
if [ ! -z "$SUPABASE_URL" ]; then
  gh secret set NEXT_PUBLIC_SUPABASE_URL --body "$SUPABASE_URL" && echo "✅ Set NEXT_PUBLIC_SUPABASE_URL"
fi

read -sp "NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
echo ""
if [ ! -z "$SUPABASE_ANON_KEY" ]; then
  gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY" && echo "✅ Set NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi

read -sp "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
echo ""
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY" && echo "✅ Set SUPABASE_SERVICE_ROLE_KEY"
fi

read -p "NEXT_PUBLIC_APP_URL (default: http://localhost:3000): " APP_URL
APP_URL=${APP_URL:-http://localhost:3000}
gh secret set NEXT_PUBLIC_APP_URL --body "$APP_URL" && echo "✅ Set NEXT_PUBLIC_APP_URL"

read -p "TEST_USER_EMAIL (test account): " TEST_EMAIL
if [ ! -z "$TEST_EMAIL" ]; then
  gh secret set TEST_USER_EMAIL --body "$TEST_EMAIL" && echo "✅ Set TEST_USER_EMAIL"
fi

read -sp "TEST_USER_PASSWORD: " TEST_PASSWORD
echo ""
if [ ! -z "$TEST_PASSWORD" ]; then
  gh secret set TEST_USER_PASSWORD --body "$TEST_PASSWORD" && echo "✅ Set TEST_USER_PASSWORD"
fi

read -sp "STRIPE_SECRET_KEY (optional, press Enter to skip): " STRIPE_KEY
echo ""
if [ ! -z "$STRIPE_KEY" ]; then
  gh secret set STRIPE_SECRET_KEY --body "$STRIPE_KEY" && echo "✅ Set STRIPE_SECRET_KEY"
fi

read -p "STRIPE_PRICE_ID (optional, press Enter to skip): " STRIPE_PRICE
echo ""
if [ ! -z "$STRIPE_PRICE" ]; then
  gh secret set STRIPE_PRICE_ID --body "$STRIPE_PRICE" && echo "✅ Set STRIPE_PRICE_ID"
fi

echo ""
echo "=================================="
echo "✅ GitHub Secrets configuration complete!"
echo ""
echo "Verify secrets with:"
echo "  gh secret list"
echo ""
echo "View detailed setup guide:"
echo "  cat docs/guides/E2E_CI_CD_SETUP.md"
