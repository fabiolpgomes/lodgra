# Testing Guide - iCal Integration

Complete guide for running and understanding the iCal integration test suite.

## Quick Start

### 1. Install Dependencies
```bash
cd /Users/fabiogomes/Projetos/home-stay
npm install
```

### 2. Run All Tests
```bash
npm test
```

### 3. View Coverage Report
```bash
npm run test:ci
```

## Test Files Overview

### 📋 Unit Tests - Booking Parser

**Location**: `src/__tests__/lib/ical/bookingParser.test.ts`

Tests the core parsing logic for extracting guest information from iCal event descriptions.

```bash
# Run only booking parser tests
npm test -- bookingParser.test.ts

# Run with verbose output
npm test -- bookingParser.test.ts --verbose
```

**Test Categories**:
1. **Empty Input Handling**
   - Undefined description
   - Empty string

2. **Booking ID Extraction**
   - Standard format: `BOOKING ID: 12345678`
   - Dash format: `BOOKING ID- 87654321`
   - No separator: `BOOKING ID ABC123XYZ`

3. **Phone Parsing**
   - International: `+34 912345678`
   - Hyphens: `+34-912345678`
   - Parentheses: `(34) 912345678`
   - Multiple numbers (gets first)

4. **Country Extraction**
   - Simple: `Spain`
   - With apostrophe: `Côte d'Ivoire`
   - Multi-word: `United Arab Emirates`

5. **Guest Count**
   - Simple: `GUESTS: 2`
   - With text: `GUESTS: 4 adults`
   - Plural form: `GUEST 3`
   - Edge cases: 0, 15

6. **Source Detection**
   - Booking.com (case-insensitive)
   - Airbnb / ABNB
   - Unknown sources
   - Precedence testing

### 🔌 Integration Tests - iCal Export

**Location**: `src/__tests__/api/ical/route.test.ts`

Tests the `GET /api/ical/[propertyId]` endpoint for generating and exporting iCal files.

```bash
# Run only iCal export tests
npm test -- "api/ical/route.test"

# Run with coverage for this file
npm test -- "api/ical/route.test" --coverage
```

**Test Scenarios**:

1. **Authentication**
   - ✅ Valid token returns 200 with .ics file
   - ❌ Invalid token returns 401
   - ❌ Missing token returns 401

2. **Property Validation**
   - ❌ Non-existent property returns 404
   - ✅ Valid property with no listings returns empty calendar

3. **Data Processing**
   - ✅ Multiple reservations generates correct calendar
   - ✅ Database errors return 500

4. **Response Validation**
   - ✅ Content-Type header is `text/calendar; charset=utf-8`
   - ✅ Content-Disposition includes filename

### 🔑 Integration Tests - Token Management

**Location**: `src/__tests__/api/properties/ical-token/route.test.ts`

Tests the `POST /api/properties/[id]/ical-token` endpoint for token regeneration.

```bash
# Run only token tests
npm test -- "ical-token/route.test"

# Run with detailed output
npm test -- "ical-token/route.test" --verbose
```

**Test Scenarios**:

1. **Authorization**
   - ✅ Admin users can regenerate tokens
   - ✅ Manager users can regenerate tokens
   - ❌ Viewer users get 403
   - ❌ Unauthenticated users get 401

2. **Security**
   - ✅ Organization isolation (cross-org access = 404)
   - ✅ New token differs from old token
   - ✅ Only authorized roles can regenerate

3. **Error Handling**
   - ❌ Non-existent property returns 404
   - ❌ Database errors return 500

## Running Specific Test Patterns

### Run All Unit Tests
```bash
npm test -- --testPathPattern="lib/"
```

### Run All Integration Tests
```bash
npm test -- --testPathPattern="api/"
```

### Run Tests by Test Name Pattern
```bash
# Test anything with "token" in the name
npm test -- --testNamePattern="token"

# Test anything with "authentication" in the name
npm test -- --testNamePattern="authorization"
```

### Run with Coverage Report
```bash
# Full coverage report
npm run test:ci

# Coverage for specific file
npm test -- bookingParser.test.ts --coverage
```

## Understanding Test Output

### Passing Test
```
 PASS  src/__tests__/lib/ical/bookingParser.test.ts
  bookingParser
    parseBookingDescription()
      ✓ should return empty object when description is undefined (2 ms)
      ✓ should extract booking ID with colon separator (1 ms)
      ...
```

### Failing Test
```
 FAIL  src/__tests__/lib/ical/bookingParser.test.ts
  bookingParser
    parseBookingDescription()
      ✓ should return empty object when description is undefined
      ✗ should extract booking ID with colon separator
        expect(result.bookingId).toBe('12345678')
        Expected: "12345678"
        Received: undefined
```

## Coverage Report

After running `npm run test:ci`, you'll see:

```
File                                 | % Stmts | % Branch | % Funcs | % Lines |
------------------------------------|---------|----------|---------|---------|
All files                            |   85.2  |   82.1   |   86.5  |   85.2  |
 src/lib/ical/bookingParser.ts       |   100   |   100    |   100   |   100   |
 src/app/api/ical/[propertyId]/...   |   82    |   80     |   85    |   82    |
 src/app/api/properties/[id]/...     |   81    |   79     |   84    |   81    |
```

## Debugging Tests

### Run Single Test File in Watch Mode
```bash
npm test -- bookingParser.test.ts --watch
```

### Run Single Test Case
```bash
npm test -- --testNamePattern="should extract booking ID"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand bookingParser.test.ts
```

Then open Chrome DevTools at `chrome://inspect`

## Mock Reference

### Supabase Client Mock
```typescript
mockSupabaseClient.from.mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { /* response */ },
        error: null
      })
    })
  })
})
```

### Authentication Mock
```typescript
mockRequireRole.mockResolvedValue({
  authorized: true,
  userId: 'user-123',
  role: 'admin',
  accessAllProperties: true,
  organizationId: 'org-456',
  response: null
})
```

### Crypto Mock
```typescript
const crypto = require('crypto')
// Returns: 'new-token-uuid-123'
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
```

## Troubleshooting

### Tests Not Running
1. Check Node.js version: `node --version` (should be 18+)
2. Install dependencies: `npm install`
3. Clear Jest cache: `npm test -- --clearCache`

### Mock Not Working
1. Ensure mocks are defined before importing the module
2. Use `jest.mock()` at the top of test file
3. Clear mocks between tests: `jest.clearAllMocks()`

### Coverage Not Meeting Threshold
1. Run `npm run test:ci` to see detailed coverage
2. Add tests for uncovered code paths
3. Check coverage configuration in `jest.config.js`

## Best Practices

1. **Run tests before committing**
   ```bash
   npm test
   ```

2. **Check coverage before pushing**
   ```bash
   npm run test:ci
   ```

3. **Use descriptive test names**
   - Good: `should extract phone number with international format`
   - Bad: `test phone extraction`

4. **One assertion per test case** (or closely related)
   ```typescript
   it('should extract all fields', () => {
     const result = parseBookingDescription(description)
     expect(result.bookingId).toBe('123')
     expect(result.phone).toBe('+34 912345678')
     // All testing same logical unit
   })
   ```

5. **Mock only external dependencies**
   - Mock: Supabase, Auth, HTTP clients
   - Don't mock: Internal utility functions

## Files Modified/Created

- ✅ `src/__tests__/lib/ical/bookingParser.test.ts` - 239 lines
- ✅ `src/__tests__/api/ical/route.test.ts` - 375 lines
- ✅ `src/__tests__/api/properties/ical-token/route.test.ts` - 370 lines
- ✅ `jest.config.js` - Jest configuration
- ✅ `jest.setup.js` - Test environment setup
- ✅ `package.json` - Updated with Jest dependencies
- ✅ `src/__tests__/README.md` - Test documentation
- ✅ `TEST_SUMMARY.md` - This summary

## Support

For issues or questions:
1. Check this guide
2. Review test file comments
3. Check Jest documentation: https://jestjs.io
4. Check Next.js testing guide: https://nextjs.org/docs/testing

---

**Last Updated**: 2026-03-16  
**Test Suite Version**: 1.0  
**Status**: Production Ready ✅
