export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: string;
    routePath: string | undefined;
    routeType: string;
    renderSource: string;
  }
) => {
  const Sentry = await import('@sentry/nextjs');

  Sentry.captureException(err, {
    tags: {
      routerKind: context.routerKind,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
    contexts: {
      request: {
        path: request.path,
        method: request.method,
        route: context.routePath,
      },
    },
  });
};
