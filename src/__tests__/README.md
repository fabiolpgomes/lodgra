# Test Suite Documentation

This directory contains unit and integration tests for the Home Stay iCal integration feature.

## Test Structure

```
src/__tests__/
├── lib/
│   └── ical/
│       └── bookingParser.test.ts          # Unit tests for booking parser
├── api/
│   ├── ical/
│   │   └── route.test.ts                  # Integration tests for GET /api/ical/[propertyId]
│   └── properties/
│       └── ical-token/
│           └── route.test.ts              # Integration tests for POST /api/properties/[id]/ical-token
```

## Test Files

### 1. bookingParser.test.ts
**Unit Tests for Booking iCal Parser**

- **File**: `src/__tests__/lib/ical/bookingParser.test.ts`
- **Line Count**: 239 lines
- **Test Cases**: 33 tests
- **Coverage**: 100% (parseBookingDescription and detectSource functions)

**Tests included**:
- Empty/undefined input handling
- Booking ID extraction (colon, dash, no separator)
- Phone number parsing (international, hyphen, parentheses formats)
- Multiple phone numbers (retrieves first)
- Country name extraction (including apostrophes and multi-word names)
- Guest count extraction (simple format, with text, plural form)
- Guest name extraction (NAME and GUEST fields)
- Complex real-world scenarios with all fields
- Case-insensitive field parsing
- Edge cases (zero guests, large numbers)
- Source detection (Booking.com, Airbnb, ABNB, unknown)
- Case-insensitive source detection
- Source precedence (Booking takes precedence)

### 2. route.test.ts (iCal Export)
**Integration Tests for GET /api/ical/[propertyId]**

- **File**: `src/__tests__/api/ical/route.test.ts`
- **Line Count**: 375 lines
- **Test Cases**: 8 tests
- **Coverage**: Main export endpoint functionality

**Tests included**:
- Successful .ics file generation with valid token
- 401 return for invalid token
- 401 return for missing token
- 404 return for non-existent property
- Empty calendar return when no listings exist
- 500 return on database error
- Multiple reservations calendar generation
- Content-Disposition header validation

**Mocks**:
- `createAdminClient()` - Supabase client
- `generateICalFromReservations()` - iCal generation

### 3. route.test.ts (iCal Token)
**Integration Tests for POST /api/properties/[id]/ical-token**

- **File**: `src/__tests__/api/properties/ical-token/route.test.ts`
- **Line Count**: 370 lines
- **Test Cases**: 8 tests
- **Coverage**: Token regeneration and authorization

**Tests included**:
- Token regeneration for authorized admin
- Token regeneration for authorized manager
- 403 rejection for unauthorized viewer
- 401 rejection for unauthenticated request
- Organization isolation enforcement (404 for cross-org access)
- New token differs from old token
- 500 return on database error
- 404 return for non-existent property

**Mocks**:
- `requireRole()` - Authentication and authorization
- `createAdminClient()` - Supabase client
- `crypto.randomUUID()` - Token generation

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:ci
```

### Run Specific Test File
```bash
npm test -- bookingParser.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Coverage

Target coverage: **80% minimum**

Current coverage by file:
- `src/lib/ical/bookingParser.ts` - 100%
- `src/app/api/ical/[propertyId]/route.ts` - 80%+
- `src/app/api/properties/[id]/ical-token/route.ts` - 80%+

## Test Patterns

### Unit Tests
- Test pure functions with multiple scenarios
- Cover edge cases and error conditions
- Verify return values and side effects

### Integration Tests
- Mock external dependencies (Supabase, authentication)
- Test endpoint request/response flow
- Verify authorization and isolation
- Test error handling

## Jest Configuration

- **Config File**: `jest.config.js`
- **Setup File**: `jest.setup.js`
- **Environment**: jest-environment-node for API tests
- **Module Aliases**: `@/` maps to `src/`

## Best Practices

1. **Test Naming**: Descriptive `it()` statements that read like requirements
2. **Arrange-Act-Assert**: Clear structure with setup, execution, verification
3. **Mocking**: Only mock external dependencies, not internal functions
4. **Organization**: Tests organized by describe blocks matching functionality
5. **Coverage**: Aim for 80%+ coverage on critical paths

## Related Files

- Implementation: `src/lib/ical/bookingParser.ts`
- Implementation: `src/app/api/ical/[propertyId]/route.ts`
- Implementation: `src/app/api/properties/[id]/ical-token/route.ts`
- Configuration: `jest.config.js`
- Configuration: `jest.setup.js`
