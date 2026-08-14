import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const buildScript = join(process.cwd(), 'scripts', 'next-build.js')

const inspectLock = (lockPath: string, command?: string) => {
  const probe = [
    `const { getActiveDevServer } = require(${JSON.stringify(buildScript)})`,
    `const command = ${JSON.stringify(command)}`,
    `process.stdout.write(JSON.stringify(getActiveDevServer(${JSON.stringify(lockPath)}, command === undefined ? undefined : () => command)))`,
  ].join(';')

  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', probe])
    let output = ''
    child.stdout.on('data', chunk => (output += chunk))
    child.on('error', reject)
    child.on('close', code => (code === 0 ? resolve(output) : reject(new Error(`Probe exited with ${code}`))))
  })
}

describe('production build preflight', () => {
  it('ignores a live PID that does not belong to Next.js dev', async () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'lodgra-build-lock-'))
    const lockPath = join(temporaryDirectory, 'lock')
    const unrelatedProcess = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'])
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: unrelatedProcess.pid, appUrl: 'http://localhost:3000' })
    )

    try {
      await expect(inspectLock(lockPath)).resolves.toBe('null')
    } finally {
      unrelatedProcess.kill()
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })

  it('detects a live PID whose command is Next.js dev', async () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'lodgra-build-lock-'))
    const lockPath = join(temporaryDirectory, 'lock')
    writeFileSync(lockPath, JSON.stringify({ pid: process.pid, appUrl: 'http://localhost:3000' }))

    try {
      const result = JSON.parse(await inspectLock(lockPath, '/app/node_modules/.bin/next dev'))
      expect(result).toMatchObject({ pid: process.pid, appUrl: 'http://localhost:3000' })
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })

  it('recognizes the process title used by the Next.js development server', async () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'lodgra-build-lock-'))
    const lockPath = join(temporaryDirectory, 'lock')
    writeFileSync(lockPath, JSON.stringify({ pid: process.pid, appUrl: 'http://localhost:3000' }))

    try {
      await expect(inspectLock(lockPath, 'next-server (v16.3.0)')).resolves.not.toBe('null')
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })
})
