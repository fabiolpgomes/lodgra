/** @jest-environment node */

import fs from 'node:fs'
import path from 'node:path'

const repositoryRoot = process.cwd()

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8')
}

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(absolutePath)
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [absolutePath] : []
  })
}

describe('multi-tenant launch boundaries', () => {
  test('runtime code never falls back to the legacy Default organization', () => {
    const legacyOrganizationId = '00000000-0000-0000-0000-000000000001'
    const offenders = sourceFiles(path.join(repositoryRoot, 'src'))
      .filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`))
      .filter((file) => !/\.(test|spec)\.[jt]sx?$/.test(file))
      .filter((file) => fs.readFileSync(file, 'utf8').includes(legacyOrganizationId))
      .map((file) => path.relative(repositoryRoot, file))

    expect(offenders).toEqual([])
  })

  test('signup creates the tenant and first administrator atomically', () => {
    // Since the 2026-09-25 baseline, production's schema lives in the baseline dump.
    const baseline = read('supabase/migrations/20260925000000_baseline_producao.sql')
    const start = baseline.indexOf('CREATE OR REPLACE FUNCTION "public"."handle_new_user"()')
    expect(start).toBeGreaterThanOrEqual(0)
    const fn = baseline.slice(start, baseline.indexOf('$$;', start))

    expect(fn).toContain("'admin'")
    expect(fn).toContain('access_all_properties')
    expect(fn).toContain('true,')
    expect(fn).not.toContain('EXCEPTION WHEN OTHERS')
    expect(fn).toContain('SET "search_path" TO \'\'')
    expect(baseline).toContain('REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;')
    expect(baseline).not.toMatch(/GRANT [^;]*"public"."handle_new_user"\(\) TO "(anon|authenticated)"/)
  })

  test('recovery migration refuses orphan profiles instead of sharing a tenant', () => {
    const migration = read(
      'supabase/migrations_archive/pre-baseline-20260925/20260814190000_fix_organizations_table.sql'
    )

    expect(migration).toContain('user_profiles contains rows without organization_id')
    expect(migration).not.toContain("SET organization_id = '00000000-0000-0000-0000-000000000001'")
  })
})
