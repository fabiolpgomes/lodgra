#!/usr/bin/env node
'use strict'

// Force webpack instead of Turbopack for production builds.
// Turbopack (Next.js 16 default) compiles middleware as edge chunks and does
// NOT generate middleware.js or middleware.js.nft.json, which Vercel CLI 51+
// requires during build finalization. Webpack generates both files correctly.
const nextBin = require.resolve('next/dist/bin/next')
process.argv = [process.execPath, nextBin, 'build', '--webpack', ...process.argv.slice(2)]
require(nextBin)
