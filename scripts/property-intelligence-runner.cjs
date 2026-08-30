#!/usr/bin/env node

const fs = require('node:fs')
const { stdin, stderr, stdout } = require('node:process')
const Module = require('node:module')
const ts = require('typescript')

const originalResolveFilename = Module._resolveFilename
const PROPERTY_INTELLIGENCE_GATE_ENV = 'PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED'

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options)
  } catch (error) {
    if ((request.startsWith('./') || request.startsWith('../')) && !request.endsWith('.ts')) {
      try {
        return originalResolveFilename.call(this, `${request}.ts`, parent, isMain, options)
      } catch (nestedError) {
        // fall through to original error
      }
    }

    throw error
  }
}

Module._extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  }).outputText

  module._compile(output, filename)
}

function parseArgs(argv) {
  const args = {
    inputPath: null,
    format: 'both',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--input' && argv[index + 1]) {
      args.inputPath = argv[index + 1]
      index += 1
      continue
    }

    if (value === '--format' && argv[index + 1]) {
      const requestedFormat = argv[index + 1]
      if (requestedFormat === 'json' || requestedFormat === 'markdown' || requestedFormat === 'both') {
        args.format = requestedFormat
      }
      index += 1
    }
  }

  return args
}

async function readInput(inputPath) {
  if (inputPath) {
    return fs.promises.readFile(inputPath, 'utf8')
  }

  if (stdin.isTTY) {
    return ''
  }

  return new Promise((resolve, reject) => {
    let buffer = ''
    stdin.setEncoding('utf8')
    stdin.on('data', chunk => {
      buffer += chunk
    })
    stdin.on('end', () => resolve(buffer))
    stdin.on('error', reject)
  })
}

async function main() {
  if (process.env[PROPERTY_INTELLIGENCE_GATE_ENV] === 'false') {
    stderr.write('Property Intelligence CLI is disabled by feature gate.\n')
    process.exit(2)
  }

  const { inputPath, format } = parseArgs(process.argv.slice(2))
  const rawInput = await readInput(inputPath)

  if (!rawInput.trim()) {
    stderr.write(
      [
        'Usage: npm run property-intelligence -- --input path/to/input.json --format both',
        '',
        'Expected input: JSON with property.location and property.typology at minimum.',
      ].join('\n')
    )
    process.exit(1)
  }

  let parsedInput
  try {
    parsedInput = JSON.parse(rawInput)
  } catch (error) {
    stderr.write(`Invalid JSON input: ${error.message}\n`)
    process.exit(1)
  }

  const {
    runPropertyIntelligenceAnalysis,
    buildMarkdownReport,
    serializeJsonReport,
  } = require('../src/lib/property-intelligence/index.ts')

  const result = runPropertyIntelligenceAnalysis(parsedInput)
  const jsonReport = serializeJsonReport(result)
  const markdownReport = buildMarkdownReport(result, {
    companyName: parsedInput.companyInfo?.name ?? null,
  })

  for (const event of result.telemetry.events) {
    stderr.write(`[telemetry] ${event.name} traceId=${result.traceId}\n`)
  }
  stderr.write(
    `[telemetry] publish_approval=${result.publication.approved ? 'approved' : 'pending'} traceId=${result.traceId}\n`
  )

  if (format === 'json') {
    stdout.write(`${jsonReport}\n`)
    return
  }

  if (format === 'markdown') {
    stdout.write(`${markdownReport}\n`)
    return
  }

  stdout.write(`${markdownReport}\n\n--- JSON ---\n\n${jsonReport}\n`)
}

main().catch(error => {
  stderr.write(`Property Intelligence CLI failed: ${error.message}\n`)
  process.exit(1)
})
