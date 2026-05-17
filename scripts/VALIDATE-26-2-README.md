# Story 26.2 Post-Deploy Validation Script

## Overview

Comprehensive validation script for Story 26.2 (Schema.org LodgingBusiness Markup) that validates three critical acceptance criteria:

- **AC4**: Google Rich Results Test (JSON-LD structure compliance)
- **AC7**: Portuguese/Spanish content mapping (multi-language amenities)
- **AC11**: Performance benchmarking (< 50ms generation time)

## Prerequisites

- Node.js 18+
- Project dependencies installed (`npm install`)
- `tsx` package (installed automatically via npx)

## Usage

### Basic Validation

Run all validations with default output:

```bash
npx tsx scripts/validate-26-2.ts
```

### Verbose Output

Show detailed information including generated schema and amenity mappings:

```bash
npx tsx scripts/validate-26-2.ts --verbose
```

### JSON Output

Export results in JSON format for programmatic processing:

```bash
npx tsx scripts/validate-26-2.ts --json
```

### Combined Options

```bash
npx tsx scripts/validate-26-2.ts --verbose --json
```

## What It Validates

### AC4: Google Rich Results Test (JSON-LD Structure)

**Validates:**
- ✅ Valid JSON-LD syntax
- ✅ Correct `@context` (https://schema.org)
- ✅ Correct `@type` (LodgingBusiness)
- ✅ All mandatory fields present:
  - `name`, `description`, `url`, `address`, `telephone`, `priceRange`, `image`
- ✅ Address structure (PostalAddress with streetAddress, addressLocality, postalCode, addressCountry)
- ✅ Image format (string or array of strings)
- ✅ Offer object structure (price, priceCurrency)

**Test Property:** Portuguese apartment in Lisboa with full property data

**Sample Output:**
```
✓ JSON-LD structure is valid per Schema.org LodgingBusiness
```

---

### AC7: Portuguese/Spanish Content Mapping

**Validates:**
- ✅ Portuguese amenity mapping (piscina→pool, ar condicionado→ac, etc.)
- ✅ Spanish amenity mapping
- ✅ Locale parameter support (pt-PT, pt-BR, es-ES, en-US)
- ✅ Alternate locale list

**Mapped Amenities:**
| Portuguese | Mapped Value | English |
|------------|-------------|---------|
| piscina | pool | Swimming pool |
| ar condicionado | ac | Air conditioning |
| wi-fi | wifi | WiFi |
| estacionamento | parking | Parking |
| elevador | elevator | Elevator |

**Test Properties:**
- Portuguese property (Lisboa) with full amenity list
- Spanish property (Barcelona) with amenities

**Sample Output:**
```
✓ Portuguese (PT) amenity mapping is correct
✓ Spanish (ES) amenity mapping is correct
```

---

### AC11: Performance Benchmarking

**Validates:**
- ✅ JSON-LD generation time < 50ms (threshold)
- ✅ Performance metrics:
  - Min latency
  - Average latency
  - Median latency
  - P95 latency (95th percentile)
  - P99 latency (99th percentile)
  - Max latency

**Benchmark Details:**
- 100 iterations per test
- Warm-up run before benchmark
- Uses Node.js high-resolution timer (nanoseconds)
- Converts to milliseconds for readability

**Sample Output:**
```
Running benchmark with 100 iterations...
  Min:    0.01ms
  Avg:    0.01ms
  Median: 0.01ms
  P95:    0.03ms
  P99:    0.19ms
  Max:    0.19ms
✓ Performance target met (max 0.19ms <= 50ms)
```

---

## Exit Codes

- **0**: All validations PASSED ✓
- **1**: One or more validations FAILED ✗

## Integration with CI/CD

Add to `package.json` scripts:

```json
{
  "scripts": {
    "validate:story-26-2": "npx tsx scripts/validate-26-2.ts",
    "validate:story-26-2:verbose": "npx tsx scripts/validate-26-2.ts --verbose",
    "validate:story-26-2:json": "npx tsx scripts/validate-26-2.ts --json"
  }
}
```

Then run in CI pipeline:

```bash
npm run validate:story-26-2
```

## Interpreting Results

### ✓ PASS

All validations passed. Story 26.2 is production-ready.

```
AC4 (Schema.org): ✓ PASS
AC7 (Multi-language): ✓ PASS
AC11 (Performance): ✓ PASS

✓ All validations PASSED — Story 26.2 ready for production!
```

### ✗ FAIL

One or more validations failed. Review the detailed error messages.

```
AC4 (Schema.org): ✗ FAIL
  - Missing mandatory field: priceRange
  - Address missing field: addressCountry

AC7 (Multi-language): ✓ PASS
AC11 (Performance): ✓ PASS

✗ Some validations FAILED — Review issues above
```

## Troubleshooting

### Module not found error

**Error:** `Cannot find module '../src/lib/seo/lodgingBusinessSchema'`

**Solution:** Ensure you're running from the project root directory and dependencies are installed:

```bash
npm install
```

### Performance test slower than expected

The first run may be slower due to Node.js JIT compilation. Subsequent runs are faster.

### JSON-LD generation is slower on CI/CD

CI/CD environments may have slower CPUs. The test uses relative benchmarks (against 50ms threshold), not absolute performance targets.

## Post-Deploy Validation Checklist

After running this script, also perform manual validations:

- [ ] **AC4 Manual**: Execute Google Rich Results Test at https://search.google.com/test/rich-results
- [ ] **AC7 Manual**: QA verifies Portuguese/Spanish property data in staging
- [ ] **AC11 Manual**: Monitor JSON-LD generation time in production logs
- [ ] **AC12 Manual**: Test OG/Twitter card previews on social media

## Related Files

- **Implementation:** `src/lib/seo/lodgingBusinessSchema.ts`
- **Server Component:** `src/components/seo/LodgingBusinessSchema.tsx`
- **Meta Tags:** `src/lib/seo/metaTags.ts`
- **Unit Tests:** `src/__tests__/lib/seo/lodgingBusinessSchema.test.ts`
- **Integration Tests:** `src/__tests__/components/seo/LodgingBusinessSchema.test.tsx`
- **QA Report:** `docs/qa/story-26.2-qa-report.md`
- **Gate Decision:** `docs/qa/gates/story-26.2-gate.yaml`

## Support

For issues or questions about this validation script:
1. Check the "Troubleshooting" section above
2. Review QA report: `docs/qa/story-26.2-qa-report.md`
3. Run with `--verbose` flag for detailed output
