// Compatibility for existing schedulers. Only one worker writes reservations.
export { POST as GET } from '@/app/api/email-extraction/process-pending/route'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
