import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const projectFile = (...segments: string[]) => join(process.cwd(), ...segments)

describe('self-hosted application fonts', () => {
  const fontFiles = [
    'poppins-bold-latin.woff2',
    'inter-latin.woff2',
    'hanken-grotesk-latin.woff2',
  ]

  it('loads every application font through next/font/local', () => {
    const layout = readFileSync(projectFile('src', 'app', 'layout.tsx'), 'utf8')

    expect(layout).toContain('from "next/font/local"')
    expect(layout).not.toContain('next/font/google')
    fontFiles.forEach(fileName => expect(layout).toContain(`./fonts/${fileName}`))
  })

  it.each(fontFiles)('%s is a valid WOFF2 asset', fileName => {
    const font = readFileSync(projectFile('src', 'app', 'fonts', fileName))
    expect(font.subarray(0, 4).toString('ascii')).toBe('wOF2')
    expect(font.length).toBeGreaterThan(1_000)
  })

  it('keeps production builds on Turbopack without a Vercel-only fallback', () => {
    const buildScript = readFileSync(projectFile('scripts', 'next-build.js'), 'utf8')

    expect(buildScript).not.toContain('--webpack')
    expect(buildScript).not.toContain('process.env.VERCEL')
  })
})
