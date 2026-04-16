import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  route?: string;
  [key: string]: unknown;
}

function createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    ...(error instanceof Error
      ? { error: { name: error.name, message: error.message, stack: error.stack } }
      : error !== undefined
        ? { error: String(error) }
        : {}),
  };

  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(createLogEntry('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(createLogEntry('warn', message, context));
    Sentry.addBreadcrumb({
      category: 'app',
      message,
      level: 'warning',
      data: context,
    });
  },

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(createLogEntry('error', message, context, error));

    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          route: context?.route,
          organizationId: context?.organizationId,
        },
        extra: context,
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        tags: {
          route: context?.route,
          organizationId: context?.organizationId,
        },
        extra: { ...context, rawError: error },
      });
    }
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(createLogEntry('debug', message, context));
    }
  },
};

/**
 * Generate a unique request ID for correlating logs within a single request.
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}
