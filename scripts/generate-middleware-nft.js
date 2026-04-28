#!/usr/bin/env node
// Turbopack doesn't generate middleware.js.nft.json (Node File Trace),
// but Vercel CLI 51+ expects it. Middleware runs on Edge runtime so it
// has no Node dependencies — we create an empty trace file.
const fs = require('fs')
const path = require('path')

const nftPath = path.join(process.cwd(), '.next', 'server', 'middleware.js.nft.json')

if (!fs.existsSync(nftPath)) {
  fs.writeFileSync(nftPath, JSON.stringify({ version: 1, files: [] }))
  console.log('Created .next/server/middleware.js.nft.json (Turbopack workaround)')
}
