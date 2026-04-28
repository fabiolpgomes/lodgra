#!/usr/bin/env node
// Turbopack doesn't generate middleware.js.nft.json (Node File Trace),
// but Vercel CLI 51+ expects it during build finalization. Middleware
// runs on Edge runtime so it has no Node dependencies — create empty trace.
const fs = require('fs')
const path = require('path')

const serverDir = path.join(process.cwd(), '.next', 'server')
const nftPath = path.join(serverDir, 'middleware.js.nft.json')

if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true })

if (!fs.existsSync(nftPath)) {
  fs.writeFileSync(nftPath, JSON.stringify({ version: 1, files: [] }))
  console.log('[build] Created .next/server/middleware.js.nft.json (Turbopack workaround)')
}
