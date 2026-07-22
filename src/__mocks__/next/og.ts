// Mock for next/og (used for dynamic OG images)
export class ImageResponse {
  constructor(public jsx: any, public options?: any) {}

  async arrayBuffer() {
    return new ArrayBuffer(0);
  }

  get headers() {
    return {
      'content-type': 'image/png',
      'cache-control': 'public, no-cache, no-store, must-revalidate',
    };
  }
}
