/**
 * Story 26.2 Post-Deploy Validation Script
 *
 * Validates:
 * - AC4: JSON-LD structure (Schema.org LodgingBusiness compliance)
 * - AC7: Portuguese/Spanish content mapping (amenities translation)
 * - AC11: Performance benchmarking (< 50ms generation time)
 *
 * Usage: npx tsx scripts/validate-26-2.ts [--verbose] [--json]
 */

import { generateLodgingBusinessJsonLd } from '@/lib/seo/lodgingBusinessSchema'

const VERBOSE = process.argv.includes('--verbose')
const JSON_OUTPUT = process.argv.includes('--json')

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = (msg: string, color: keyof typeof colors = 'reset') => {
  if (!JSON_OUTPUT) {
    console.log(`${colors[color]}${msg}${colors.reset}`)
  }
}

const error = (msg: string) => log(msg, 'red')
const success = (msg: string) => log(msg, 'green')
const warning = (msg: string) => log(msg, 'yellow')
const info = (msg: string) => log(msg, 'cyan')

// ============================================================================
// AC4: JSON-LD Structure Validation (Google Rich Results)
// ============================================================================

function validateJsonLdStructure(schema: Record<string, any>): string[] {
  const issues: string[] = []

  // Check @context
  if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
    issues.push('Missing or invalid @context (should be https://schema.org)')
  }

  // Check @type
  if (!schema['@type'] || schema['@type'] !== 'LodgingBusiness') {
    issues.push('Missing or invalid @type (should be LodgingBusiness)')
  }

  // Mandatory fields per Google Vacation Rentals
  const mandatoryFields = ['name', 'description', 'url', 'address', 'telephone', 'priceRange', 'image']
  mandatoryFields.forEach((field) => {
    if (!schema[field]) {
      issues.push(`Missing mandatory field: ${field}`)
    }
  })

  // Check address structure
  if (schema.address) {
    if (schema.address['@type'] !== 'PostalAddress') {
      issues.push('Address missing @type PostalAddress')
    }
    const addressFields = ['streetAddress', 'addressLocality', 'postalCode', 'addressCountry']
    addressFields.forEach((field) => {
      if (!schema.address[field]) {
        issues.push(`Address missing field: ${field}`)
      }
    })
  }

  // Check image format
  if (schema.image) {
    if (Array.isArray(schema.image)) {
      if (schema.image.length === 0) {
        issues.push('Image array is empty')
      }
    } else if (typeof schema.image !== 'string') {
      issues.push('Image must be string or array of strings')
    }
  }

  // Check offer structure
  if (schema.makesOffer) {
    if (schema.makesOffer['@type'] !== 'Offer') {
      issues.push('Offer missing @type')
    }
    if (!schema.makesOffer.price) {
      issues.push('Offer missing price')
    }
    if (!schema.makesOffer.priceCurrency) {
      issues.push('Offer missing priceCurrency')
    }
  }

  return issues
}

// ============================================================================
// AC7: Portuguese/Spanish Content Validation
// ============================================================================

function validateMultiLanguageContent(propertyData: any, schema: Record<string, any>): string[] {
  const issues: string[] = []

  // Test Portuguese amenity mapping
  const ptAmenities = [
    { input: 'piscina', expected: 'pool' },
    { input: 'ar condicionado', expected: 'ac' },
    { input: 'wi-fi', expected: 'wifi' },
    { input: 'estacionamento', expected: 'parking' },
    { input: 'elevador', expected: 'elevator' },
  ]

  if (propertyData.structuredAmenities) {
    const amenityNames = schema.amenityFeature?.map((a: any) => a.name) || []

    ptAmenities.forEach(({ input, expected }) => {
      if (propertyData.structuredAmenities.some((a: any) => a.name.toLowerCase() === input)) {
        if (!amenityNames.includes(expected)) {
          issues.push(`Portuguese amenity "${input}" not mapped to "${expected}"`)
        }
      }
    })
  }

  // Check locale parameter
  if (propertyData.locale) {
    const validLocales = ['pt-PT', 'pt-BR', 'es-ES', 'en-US']
    if (!validLocales.includes(propertyData.locale)) {
      issues.push(`Unsupported locale: ${propertyData.locale}`)
    }
  }

  return issues
}

// ============================================================================
// AC11: Performance Benchmarking
// ============================================================================

function benchmarkPerformance(propertyData: any, iterations: number = 100) {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint()
    generateLodgingBusinessJsonLd(propertyData)
    const end = process.hrtime.bigint()

    // Convert to milliseconds
    const ms = Number(end - start) / 1_000_000
    times.push(ms)
  }

  // Calculate statistics
  times.sort((a, b) => a - b)

  const stats = {
    iterations,
    min: times[0],
    max: times[times.length - 1],
    avg: times.reduce((a, b) => a + b) / times.length,
    median: times[Math.floor(times.length / 2)],
    p95: times[Math.floor(times.length * 0.95)],
    p99: times[Math.floor(times.length * 0.99)],
  }

  return stats
}

// ============================================================================
// Test Data Generators
// ============================================================================

function createPortugueseProperty() {
  return {
    name: 'Apartamento Luxo Lisboa',
    description: 'Um apartamento moderno no coração de Lisboa com vista para o Tejo',
    city: 'Lisboa',
    country: 'Portugal',
    address: 'Rua da Rosa, 42',
    postal_code: '1200-001',
    base_price: 150,
    currency: 'EUR',
    max_guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    slug: 'apartamento-luxo-lisboa',
    latitude: 38.7223,
    longitude: -9.1393,
    telephone: '+351 21 1234567',
    checkin_from: '15:00:00',
    checkout_until: '11:00:00',
    imageUrls: ['https://example.com/apt1.jpg', 'https://example.com/apt2.jpg'],
    structuredAmenities: [
      { name: 'piscina', category: 'recreação' },
      { name: 'ar condicionado', category: 'clima' },
      { name: 'wi-fi', category: 'conectividade' },
      { name: 'estacionamento', category: 'transporte' },
      { name: 'elevador', category: 'acesso' },
    ],
    locale: 'pt-PT',
    reviewScore: {
      globalAvg: 4.8,
      totalCount: 25,
    },
    featuredReviews: [
      {
        reviewer_name: 'João Silva',
        rating: 10,
        source: 'booking',
        comment: 'Excelente localização e muito confortável!',
        review_date: '2026-05-10',
      },
      {
        reviewer_name: 'Maria Santos',
        rating: 5,
        source: 'airbnb',
        comment: 'Perfeito para a nossa viagem!',
        review_date: '2026-05-05',
      },
    ],
  }
}

function createSpanishProperty() {
  return {
    name: 'Apartamento Moderno Barcelona',
    description: 'Apartamento de lujo en el corazón de Barcelona con vistas a la ciudad',
    city: 'Barcelona',
    country: 'Spain',
    address: 'Paseo de Gracia, 50',
    postal_code: '08007',
    base_price: 200,
    currency: 'EUR',
    max_guests: 5,
    bedrooms: 3,
    bathrooms: 2,
    slug: 'apartamento-barcelona',
    latitude: 41.3851,
    longitude: 2.1734,
    telephone: '+34 93 1234567',
    imageUrls: ['https://example.com/apt-bcn.jpg'],
    structuredAmenities: [
      { name: 'piscina', category: 'recreación' },
      { name: 'wi-fi', category: 'conectividad' },
    ],
    locale: 'es-ES',
    reviewScore: {
      globalAvg: 4.6,
      totalCount: 18,
    },
  }
}

async function runValidation() {
  const results: any = {
    timestamp: new Date().toISOString(),
    ac4: { status: 'pending', issues: [], schema: null },
    ac7: { status: 'pending', issues: [] },
    ac11: { status: 'pending', benchmark: null, threshold: 50 },
  }

  info('\n═══════════════════════════════════════════════════════════════')
  info('  Story 26.2: Post-Deploy Validation Script')
  info('  Validating: AC4, AC7, AC11')
  info('═══════════════════════════════════════════════════════════════\n')

  // ========================================================================
  // AC4: Schema.org Validation
  // ========================================================================
  info('🧪 AC4: Google Rich Results Test (JSON-LD Structure)\n')

  try {
    const ptProperty = createPortugueseProperty()
    const schema = generateLodgingBusinessJsonLd(ptProperty)

    // Validate JSON structure
    try {
      JSON.parse(JSON.stringify(schema))
    } catch (e: any) {
      results.ac4.issues.push('Invalid JSON: ' + e.message)
    }

    // Validate schema structure
    const structureIssues = validateJsonLdStructure(schema)
    results.ac4.issues.push(...structureIssues)
    results.ac4.schema = schema

    if (structureIssues.length === 0) {
      success('✓ JSON-LD structure is valid per Schema.org LodgingBusiness')
      results.ac4.status = 'pass'
    } else {
      error('✗ JSON-LD structure issues found:')
      structureIssues.forEach((issue) => error(`  - ${issue}`))
      results.ac4.status = 'fail'
    }

    if (VERBOSE) {
      log('\nGenerated Schema (first 500 chars):')
      log(JSON.stringify(schema).substring(0, 500) + '...')
    }
  } catch (e: any) {
    error(`AC4 validation error: ${e.message}`)
    results.ac4.status = 'error'
    results.ac4.issues.push(e.message)
  }

  // ========================================================================
  // AC7: Multi-Language Content Validation
  // ========================================================================
  info('\n🧪 AC7: Portuguese/Spanish Content Mapping\n')

  try {
    const ptProperty = createPortugueseProperty()
    const ptSchema = generateLodgingBusinessJsonLd(ptProperty)
    const ptIssues = validateMultiLanguageContent(ptProperty, ptSchema)

    const esProperty = createSpanishProperty()
    const esSchema = generateLodgingBusinessJsonLd(esProperty)
    const esIssues = validateMultiLanguageContent(esProperty, esSchema)

    results.ac7.issues.push(...ptIssues, ...esIssues)

    if (ptIssues.length === 0) {
      success('✓ Portuguese (PT) amenity mapping is correct')
      if (VERBOSE && ptSchema.amenityFeature) {
        log('  Mapped amenities:')
        ptSchema.amenityFeature.forEach((a: any) => log(`    - ${a.name}`))
      }
    } else {
      error('✗ Portuguese amenity mapping issues:')
      ptIssues.forEach((issue) => error(`  - ${issue}`))
    }

    if (esIssues.length === 0) {
      success('✓ Spanish (ES) amenity mapping is correct')
    } else {
      error('✗ Spanish amenity mapping issues:')
      esIssues.forEach((issue) => error(`  - ${issue}`))
    }

    results.ac7.status = ptIssues.length === 0 && esIssues.length === 0 ? 'pass' : 'fail'
  } catch (e: any) {
    error(`AC7 validation error: ${e.message}`)
    results.ac7.status = 'error'
    results.ac7.issues.push(e.message)
  }

  // ========================================================================
  // AC11: Performance Benchmarking
  // ========================================================================
  info('\n🧪 AC11: Performance Benchmarking (< 50ms threshold)\n')

  try {
    const testProperty = createPortugueseProperty()

    // Warm-up run
    generateLodgingBusinessJsonLd(testProperty)

    // Benchmark with 100 iterations
    const stats = benchmarkPerformance(testProperty, 100)

    log(`Running benchmark with 100 iterations...`)
    log(`  Min:    ${stats.min.toFixed(2)}ms`)
    log(`  Avg:    ${stats.avg.toFixed(2)}ms`)
    log(`  Median: ${stats.median.toFixed(2)}ms`)
    log(`  P95:    ${stats.p95.toFixed(2)}ms`)
    log(`  P99:    ${stats.p99.toFixed(2)}ms`)
    log(`  Max:    ${stats.max.toFixed(2)}ms`)

    const threshold = 50
    if (stats.max <= threshold) {
      success(`✓ Performance target met (max ${stats.max.toFixed(2)}ms <= ${threshold}ms)`)
      results.ac11.status = 'pass'
    } else {
      error(`✗ Performance exceeded threshold (max ${stats.max.toFixed(2)}ms > ${threshold}ms)`)
      results.ac11.status = 'fail'
    }

    if (stats.p95 > threshold) {
      warning(`⚠ P95 latency high (${stats.p95.toFixed(2)}ms > ${threshold}ms)`)
    }

    results.ac11.benchmark = stats
  } catch (e: any) {
    error(`AC11 benchmarking error: ${e.message}`)
    results.ac11.status = 'error'
  }

  // ========================================================================
  // Summary
  // ========================================================================
  info('\n═══════════════════════════════════════════════════════════════')
  info('  VALIDATION SUMMARY')
  info('═══════════════════════════════════════════════════════════════\n')

  const summary = {
    ac4: results.ac4.status === 'pass' ? '✓ PASS' : `✗ ${results.ac4.status.toUpperCase()}`,
    ac7: results.ac7.status === 'pass' ? '✓ PASS' : `✗ ${results.ac7.status.toUpperCase()}`,
    ac11: results.ac11.status === 'pass' ? '✓ PASS' : `✗ ${results.ac11.status.toUpperCase()}`,
  }

  log(`AC4 (Schema.org): ${summary.ac4}`)
  log(`AC7 (Multi-language): ${summary.ac7}`)
  log(`AC11 (Performance): ${summary.ac11}`)

  const allPass = ['ac4', 'ac7', 'ac11'].every((ac) => results[ac as keyof typeof results].status === 'pass')

  if (allPass) {
    success('\n✓ All validations PASSED — Story 26.2 ready for production!')
  } else {
    error('\n✗ Some validations FAILED — Review issues above')
  }

  info('\n═══════════════════════════════════════════════════════════════\n')

  // Output JSON if requested
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2))
  }

  process.exit(allPass ? 0 : 1)
}

runValidation().catch((e) => {
  error(`Fatal error: ${e.message}`)
  process.exit(1)
})
