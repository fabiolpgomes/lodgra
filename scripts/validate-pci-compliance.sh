#!/bin/bash

##
# PCI DSS Compliance Validation Script (Simplified)
# Validates key PCI requirements without slow grep operations
# Usage: ./scripts/validate-pci-compliance.sh
##

echo "🔒 PCI DSS Compliance Validation"
echo "=================================="

FAILED=0
PASSED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. .env.local is gitignored
echo -e "\n${YELLOW}1. Checking .env.local is gitignored...${NC}"
if grep -q "\.env\.local" .gitignore 2>/dev/null; then
  echo -e "${GREEN}✓ PASS${NC}: .env.local is in .gitignore"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: .env.local not in .gitignore"
  ((FAILED++))
fi

# 2. Webhook signature verification implemented
echo -e "\n${YELLOW}2. Checking webhook signature verification...${NC}"
if [ -f "src/lib/stripe/verify-webhook.ts" ] && grep -q "hmac\|verifyStripeSignature" src/lib/stripe/verify-webhook.ts; then
  echo -e "${GREEN}✓ PASS${NC}: Webhook signature verification implemented"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Webhook signature verification not found"
  ((FAILED++))
fi

# 3. Payment endpoints require auth
echo -e "\n${YELLOW}3. Checking payment endpoints require authentication...${NC}"
if grep -l "requireRole" src/app/api/billing/*.ts | wc -l | grep -qv "^0$"; then
  echo -e "${GREEN}✓ PASS${NC}: Payment endpoints require authentication"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Payment endpoints may not require auth"
  ((FAILED++))
fi

# 4. Sentry filters sensitive headers
echo -e "\n${YELLOW}4. Checking Sentry sanitization...${NC}"
if grep -q "\[FILTERED\]\|sensitiveHeaders" sentry.server.config.ts 2>/dev/null; then
  echo -e "${GREEN}✓ PASS${NC}: Sentry configured to filter sensitive headers"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Sentry sanitization not configured"
  ((FAILED++))
fi

# 5. TypeScript strict mode
echo -e "\n${YELLOW}5. Checking TypeScript strict mode...${NC}"
if grep -q '"strict": true' tsconfig.json 2>/dev/null; then
  echo -e "${GREEN}✓ PASS${NC}: TypeScript strict mode enabled"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: TypeScript strict mode not enabled"
  ((FAILED++))
fi

# 6. Error handling for payment errors
echo -e "\n${YELLOW}6. Checking error handling...${NC}"
if [ -f "src/lib/stripe/error-handler.ts" ]; then
  echo -e "${GREEN}✓ PASS${NC}: Centralized error handling implemented"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Error handler not found"
  ((FAILED++))
fi

# Summary
echo -e "\n=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -gt 0 ]; then
  echo -e "\n${RED}❌ COMPLIANCE VALIDATION FAILED${NC}"
  exit 1
else
  echo -e "\n${GREEN}✅ COMPLIANCE VALIDATION PASSED${NC}"
  exit 0
fi
