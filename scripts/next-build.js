#!/usr/bin/env node
'use strict'

// Turbopack (Next.js 16) doesn't generate middleware.js.nft.json but Vercel
// CLI 51+ reads it during build finalization. Patch fs to create the file
// on-demand the moment Next.js tries to open it, so the read always succeeds.

const fs = require('fs')
const path = require('path')

const NFT_FILE = 'middleware.js.nft.json'
const NFT_CONTENT = JSON.stringify({ version: 1, files: [] })

function ensureNft(filepath) {
  if (typeof filepath !== 'string' || !filepath.endsWith(NFT_FILE)) return
  if (fs.existsSync(filepath)) return
  try {
    fs.mkdirSync(path.dirname(filepath), { recursive: true })
    fs.writeFileSync(filepath, NFT_CONTENT)
    console.log(`[patch-fs] Created ${filepath}`)
  } catch (_) { /* ignore */ }
}

// Intercept all synchronous opens/reads
const _readFileSync = fs.readFileSync
fs.readFileSync = function (p, ...a) { ensureNft(p); return _readFileSync.call(fs, p, ...a) }

const _openSync = fs.openSync
fs.openSync = function (p, f, ...a) {
  if (typeof f !== 'number') ensureNft(p)
  return _openSync.call(fs, p, f, ...a)
}

// Intercept async reads
const _readFile = fs.promises.readFile
fs.promises.readFile = function (p, ...a) { ensureNft(p); return _readFile.call(fs.promises, p, ...a) }

const _open = fs.promises.open
fs.promises.open = function (p, f, ...a) {
  if (typeof f !== 'number') ensureNft(p)
  return _open.call(fs.promises, p, f, ...a)
}

// Run next build with correct argv
const nextBin = require.resolve('next/dist/bin/next')
process.argv = [process.execPath, nextBin, 'build', ...process.argv.slice(2)]
require(nextBin)
