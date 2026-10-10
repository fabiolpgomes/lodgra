import { readFileSync } from 'fs'
import { join } from 'path'
import { PLATFORM_CRON_JOBS, isPlatformCronPath } from '../cron-jobs'

const vercel = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
  crons: { path: string; schedule: string }[]
}

describe('PLATFORM_CRON_JOBS', () => {
  it.each(PLATFORM_CRON_JOBS.map(job => [job.path]))('%s está agendado em vercel.json', path => {
    expect(vercel.crons.some(cron => cron.path === path)).toBe(true)
  })

  it('isPlatformCronPath aceita só caminhos da lista', () => {
    expect(isPlatformCronPath('/api/cron/cleanup')).toBe(true)
    expect(isPlatformCronPath('/api/admin/run-cron')).toBe(false)
    expect(isPlatformCronPath(undefined)).toBe(false)
  })
})
