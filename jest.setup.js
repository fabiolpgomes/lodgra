/**
 * Jest Setup File
 * Configuration and global test setup
 */

// Import Testing Library matchers
import '@testing-library/jest-dom'

// Add TextEncoder/TextDecoder polyfill for postal-mime (Resend library)
import { TextEncoder, TextDecoder } from 'util'
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

// Add Request/Response polyfill for Next.js API route testing
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      this._url = url
      this.method = init.method || 'GET'
      this.headers = init.headers || {}
      this._body = init.body
    }
    get url() {
      return this._url
    }
    json() {
      return Promise.resolve(this._body ? JSON.parse(this._body) : {})
    }
    text() {
      return Promise.resolve(this._body || '')
    }
  }
}
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.headers = init.headers || {}
    }
    json() {
      return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
    }
    text() {
      return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
    }
  }
}

// Load environment variables from .env.local
import('dotenv').then((dotenv) => {
  dotenv.config({ path: '.env.local' })
})

// Mock environment variables if not set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
}

// Enable longer timeout for integration tests
jest.setTimeout(30000)

// Suppress console errors during tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
