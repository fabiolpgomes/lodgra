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
    const migration = read(
      'supabase/migrations/20260814195031_atomic_tenant_onboarding.sql'
    )

    expect(migration).toContain("'admin'")
    expect(migration).toContain('access_all_properties')
    expect(migration).toContain('true,')
    expect(migration).not.toContain('EXCEPTION WHEN OTHERS')
    expect(migration).toContain('SET search_path = \'\'')
    expect(migration).toContain(
      'REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated'
    )
  })

  test('recovery migration refuses orphan profiles instead of sharing a tenant', () => {
    const migration = read(
      'supabase/migrations/20260814190000_fix_organizations_table.sql'
    )

    expect(migration).toContain('user_profiles contains rows without organization_id')
    expect(migration).not.toContain("SET organization_id = '00000000-0000-0000-0000-000000000001'")
  })
})
