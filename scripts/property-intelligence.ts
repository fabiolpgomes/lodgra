#!/usr/bin/env npx tsx

import { readFile } from 'node:fs/promises'
import { stdin, stderr, stdout } from 'node:process'

import {
  buildMarkdownReport,
  runPropertyIntelligenceAnalysis,
  serializeJsonReport,
  type PropertyIntelligenceInput,
} from '@/lib/property-intelligence'

type OutputFormat = 'json' | 'markdown' | 'both'

function parseArgs(argv: string[]) {
  const args = {
    inputPath: null as string | null,
    format: 'both' as OutputFormat,
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

async function readInput(inputPath: string | null): Promise<string> {
  if (inputPath) {
    return readFile(inputPath, 'utf8')
  }

  if (stdin.isTTY) {
    return ''
  }

  return new Promise<string>((resolve, reject) => {
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
  const { inputPath, format } = parseArgs(process.argv.slice(2))
  const rawInput = await readInput(inputPath)

  if (!rawInput.trim()) {
    stderr.write(
      [
        'Usage: npx tsx scripts/property-intelligence.ts --input path/to/input.json --format both',
        '',
        'Expected input: JSON with property.location and property.typology at minimum.',
      ].join('\n')
    )
    process.exit(1)
  }

  let parsedInput: PropertyIntelligenceInput
  try {
    parsedInput = JSON.parse(rawInput) as PropertyIntelligenceInput
  } catch (error) {
    stderr.write(`Invalid JSON input: ${(error as Error).message}\n`)
    process.exit(1)
  }

  const result = runPropertyIntelligenceAnalysis(parsedInput)
  const jsonReport = serializeJsonReport(result)
  const markdownReport = buildMarkdownReport(result)

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
  stderr.write(`Property Intelligence CLI failed: ${(error as Error).message}\n`)
  process.exit(1)
})

