// Mock for next/server (used in API routes and middleware)
export class NextRequest {
  constructor(public url: string | URL, public init?: RequestInit) {}

  get nextUrl() {
    return new URL(typeof this.url === 'string' ? this.url : this.url.toString());
  }

  get ip() {
    return '127.0.0.1';
  }

  get geo() {
    return undefined;
  }
}

export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit) {
    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }

  static next(init?: ResponseInit) {
    return new NextResponse(null, init);
  }

  static redirect(url: string | URL, init?: ResponseInit) {
    return new NextResponse(null, {
      ...init,
      status: init?.status || 307,
      headers: {
        location: typeof url === 'string' ? url : url.toString(),
        ...(init?.headers || {}),
      },
    });
  }
}

export { NextResponse as default };
