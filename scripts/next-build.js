#!/usr/bin/env node
'use strict'

// Build with Turbopack (Next.js 16 default) then generate middleware.js.nft.json
//
// Problem: Turbopack compiles middleware as edge chunks and does NOT generate
// middleware.js.nft.json, which Vercel CLI 51+ requires during build finalization.
// Webpack would generate this file, but it causes OOM on large projects.
//
// Solution: Use Turbopack (fast, low memory) + create .nft.json manually after build.
// This gives us the best of both worlds: fast builds + Vercel compatibility.

const fs = require('fs')
const path = require('path')
const { execFileSync, execSync } = require('child_process')

function getProcessCommand(pid) {
  try {
    if (process.platform === 'win32') {
      return execFileSync('wmic', ['process', 'where', `ProcessId=${pid}`, 'get', 'CommandLine', '/value'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    }

    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

function getActiveDevServer(
  lockPath = path.join(process.cwd(), '.next/dev/lock'),
  readProcessCommand = getProcessCommand
) {
  if (!fs.existsSync(lockPath)) return null

  try {
    const server = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
    if (!Number.isInteger(server.pid) || server.pid <= 0) return null

    process.kill(server.pid, 0)
    const command = readProcessCommand(server.pid)
    return command &&
      (/(?:^|[/\\])next(?:\.js|[/\\]dist[/\\]bin[/\\]next)?\s+dev(?:\s|$)/i.test(command) ||
        /^next-server\s+\(v[^)]+\)/i.test(command))
      ? server
      : null
  } catch {
    // A stale or malformed lock must not block a production build.
    return null
  }
}

function assertNoActiveDevServer(lockPath) {
  const server = getActiveDevServer(lockPath)
  if (!server) return

  const address = server.appUrl || `${server.hostname || 'localhost'}:${server.port || 'unknown'}`
  throw new Error(
    `Cannot run a production build while Next.js dev server PID ${server.pid} is active at ${address}. Stop it and retry.`
  )
}

function runBuild() {
  // Run Next.js build with Turbopack
  const nextBin = require.resolve('next/dist/bin/next')
  const buildCmd = `"${process.execPath}" "${nextBin}" build`

  assertNoActiveDevServer()
  console.log('Running Next.js build with Turbopack...')
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
      console.log('✓ middleware.js.nft.json already exists in the build output')
    }
  } catch (err) {
    console.error('Warning: Could not generate middleware.js.nft.json:', err.message)
    process.exit(1)
  }
}

if (require.main === module) runBuild()

module.exports = { assertNoActiveDevServer, getActiveDevServer, getProcessCommand, runBuild }
