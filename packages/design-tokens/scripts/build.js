#!/usr/bin/env node

/**
 * Build Design Tokens Package
 *
 * Generates:
 * - dist/tokens.css — CSS variables
 * - dist/tokens.json — JSON format
 * - dist/index.js — JavaScript module
 * - dist/index.d.ts — TypeScript definitions
 */

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')

const ROOT = path.join(__dirname, '..')
const MONOREPO_ROOT = path.join(ROOT, '../..')
const DIST = path.join(ROOT, 'dist')
const TOKENS_FILE = path.join(MONOREPO_ROOT, 'tokens.yaml')

// Create dist directory
if (!fs.existsSync(DIST)) {
  fs.mkdirSync(DIST, { recursive: true })
}

// Read tokens
console.log('📖 Reading tokens.yaml...')
const tokensContent = fs.readFileSync(TOKENS_FILE, 'utf8')
const tokens = YAML.parse(tokensContent)

// 1. Generate CSS Variables
console.log('🎨 Generating CSS variables...')
let cssContent = `/* Design Tokens - Generated CSS Variables */
/* Last updated: ${new Date().toISOString()} */

:root {
`

function generateCSSVariables(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const cssVarName = `--lodgra-${prefix ? prefix + '-' : ''}${key}`.replace(/([A-Z])/g, '-$1').toLowerCase()

    if (value && typeof value === 'object' && !value.value) {
      generateCSSVariables(value, prefix ? `${prefix}-${key}` : key)
    } else if (value && value.value) {
      cssContent += `  ${cssVarName}: ${value.value};\n`
    }
  }
}

generateCSSVariables(tokens)
cssContent += `}\n`

fs.writeFileSync(path.join(DIST, 'tokens.css'), cssContent)
console.log('✓ CSS variables generated')

// 2. Generate JSON
console.log('📋 Generating JSON export...')
fs.writeFileSync(path.join(DIST, 'tokens.json'), JSON.stringify(tokens, null, 2))
console.log('✓ JSON generated')

// 3. Generate JavaScript module
console.log('📦 Generating JavaScript module...')
const jsExport = `module.exports = ${JSON.stringify(tokens, null, 2)};`
fs.writeFileSync(path.join(DIST, 'index.cjs'), jsExport)

const esmExport = `export default ${JSON.stringify(tokens, null, 2)};`
fs.writeFileSync(path.join(DIST, 'index.js'), esmExport)
console.log('✓ JavaScript module generated')

// 4. Generate TypeScript definitions
console.log('🔷 Generating TypeScript definitions...')
const dtsContent = `/**
 * Design Tokens for Lodgra
 * W3C Design Tokens Community Group (DTCG) Format
 */

export interface Token {
  value: string | number
  description?: string
  category?: string
  usages?: string[]
}

export interface TokenGroup {
  [key: string]: Token | TokenGroup
}

export interface DesignTokens {
  colors: TokenGroup
  typography: TokenGroup
  spacing: TokenGroup
  [key: string]: TokenGroup
}

declare const tokens: DesignTokens
export default tokens
`

fs.writeFileSync(path.join(DIST, 'index.d.ts'), dtsContent)
console.log('✓ TypeScript definitions generated')

// 5. Copy supporting files
console.log('📄 Copying supporting files...')
const files = ['tokens.yaml', 'README.md', 'CHANGELOG.md']
for (const file of files) {
  const src = path.join(MONOREPO_ROOT, file)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(ROOT, file))
  }
}
console.log('✓ Files copied')

// Summary
console.log('\n✅ Build complete!\n')
console.log('Generated files:')
console.log('  dist/tokens.css      — CSS variables')
console.log('  dist/tokens.json     — JSON format')
console.log('  dist/index.js        — ES module')
console.log('  dist/index.cjs       — CommonJS module')
console.log('  dist/index.d.ts      — TypeScript definitions')
console.log('\nReady for npm publish!')
