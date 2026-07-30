export interface NotificationLog {
  id: string
  type: 'email' | 'sms'
  reservation_id: string
  guest_email?: string
  guest_phone?: string
  status: 'sent' | 'failed' | 'pending'
  message_id?: string
  error_message?: string
  sent_at: string
  created_at: string
}

export interface NotificationMetrics {
  total: number
  sent: number
  failed: number
  pending: number
  successRate: number
  failureRate: number
  emailTotal: number
  emailSent: number
  emailFailed: number
  smsTotal: number
  smsSent: number
  smsFailed: number
}

export interface PaginatedNotificationLogs {
  data: NotificationLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function calculateMetrics(logs: NotificationLog[]): NotificationMetrics {
  if (logs.length === 0) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
      failureRate: 0,
      emailTotal: 0,
      emailSent: 0,
      emailFailed: 0,
      smsTotal: 0,
      smsSent: 0,
      smsFailed: 0,
    }
  }

  const total = logs.length
  const sent = logs.filter((l) => l.status === 'sent').length
  const failed = logs.filter((l) => l.status === 'failed').length
  const pending = logs.filter((l) => l.status === 'pending').length

  const successRate = total > 0 ? (sent / total) * 100 : 0
  const failureRate = total > 0 ? (failed / total) * 100 : 0

  const emailLogs = logs.filter((l) => l.type === 'email')
  const smsLogs = logs.filter((l) => l.type === 'sms')

  const emailSent = emailLogs.filter((l) => l.status === 'sent').length
  const emailFailed = emailLogs.filter((l) => l.status === 'failed').length
  const smsSent = smsLogs.filter((l) => l.status === 'sent').length
  const smsFailed = smsLogs.filter((l) => l.status === 'failed').length

  return {
    total,
    sent,
    failed,
    pending,
    successRate: Math.round(successRate * 100) / 100,
    failureRate: Math.round(failureRate * 100) / 100,
    emailTotal: emailLogs.length,
    emailSent,
    emailFailed,
    smsTotal: smsLogs.length,
    smsSent,
    smsFailed,
  }
}

export function filterNotificationLogs(
  logs: NotificationLog[],
  filters?: {
    type?: 'email' | 'sms'
    status?: 'sent' | 'failed' | 'pending'
    startDate?: Date
    endDate?: Date
  }
): NotificationLog[] {
  let filtered = [...logs]

  if (filters?.type) {
    filtered = filtered.filter((log) => log.type === filters.type)
  }

  if (filters?.status) {
    filtered = filtered.filter((log) => log.status === filters.status)
  }

  if (filters?.startDate) {
    const startTime = filters.startDate.getTime()
    filtered = filtered.filter((log) => new Date(log.sent_at).getTime() >= startTime)
  }

  if (filters?.endDate) {
    const endTime = filters.endDate.getTime()
    filtered = filtered.filter((log) => new Date(log.sent_at).getTime() <= endTime)
  }

  return filtered.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
}

export function paginateNotificationLogs(
  logs: NotificationLog[],
  page: number = 1,
  pageSize: number = 20
): PaginatedNotificationLogs {
  const total = logs.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize

  const data = logs.slice(start, end)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export function groupNotificationsByReservation(logs: NotificationLog[]) {
  const grouped: Record<string, NotificationLog[]> = {}

  for (const log of logs) {
    if (!grouped[log.reservation_id]) {
      grouped[log.reservation_id] = []
    }
    grouped[log.reservation_id].push(log)
  }

  return grouped
}

export function canResendNotification(log: NotificationLog): boolean {
  // Can resend if the notification failed
  return log.status === 'failed'
}
