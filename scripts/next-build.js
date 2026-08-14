#!/usr/bin/env node
'use strict'

// Build with Turbopack locally, or Webpack on Vercel, then generate middleware.js.nft.json
//
// Problem: Turbopack compiles middleware as edge chunks and does NOT generate
// middleware.js.nft.json, which Vercel CLI 51+ requires during build finalization.
// Webpack would generate this file, but it causes OOM on large projects.
//
// Solution: Use Turbopack locally (fast, low memory), but fall back to Webpack on
// Vercel where the platform Turbopack version can lag behind Next.js. Generate
// .nft.json manually only when the selected bundler does not create it.

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Vercel's builder may use an older CLI/Turbopack than the app's Next.js release.
const nextBin = require.resolve('next/dist/bin/next')
const useWebpack = process.env.VERCEL === '1'
const buildCmd = `"${process.execPath}" "${nextBin}" build${useWebpack ? ' --webpack' : ''}`

console.log(`Running Next.js build with ${useWebpack ? 'Webpack' : 'Turbopack'}...`)
execSync(buildCmd, { stdio: 'inherit' })

// After build completes, generate middleware.js.nft.json for Vercel compatibility
console.log('Generating middleware.js.nft.json for Vercel...')
try {
  const middlewareNftPath = path.join(process.cwd(), '.next/server/middleware.js.nft.json')

  // Only create if it doesn't already exist (webpack generates it, Turbopack doesn't)
  if (!fs.existsSync(middlewareNftPath)) {
    const nftContent = {
      version: 3,
      files: [
        'middleware.ts',
        'next.config.js',
        'tsconfig.json',
        'tsconfig.build.json',
      ],
    }

    fs.writeFileSync(middlewareNftPath, JSON.stringify(nftContent, null, 2))
    console.log('✓ Generated middleware.js.nft.json for Vercel compatibility')
  } else {
    console.log('✓ middleware.js.nft.json already exists (webpack output)')
  }
} catch (err) {
  console.error('Warning: Could not generate middleware.js.nft.json:', err.message)
  process.exit(1)
}
