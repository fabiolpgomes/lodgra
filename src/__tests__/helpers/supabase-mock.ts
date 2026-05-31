/**
 * Supabase Mock Factory for Testing
 *
 * Provides reusable, type-safe mock builders for Supabase client
 * Eliminates duplicate mock code across test files
 */

export interface MockTableRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface MockQueryBuilder {
  data: MockTableRow | MockTableRow[] | null
  error: Error | null
}

/**
 * Advanced query builder that supports chaining and callbacks
 */
export class ChainableQueryBuilder {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _data: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _error: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _callbacks: Map<string, (arg?: any) => void> = new Map()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _state: { [key: string]: any } = {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data: any = null, error: any = null) {
    this._data = data
    this._error = error
  }

  // Support dynamic callbacks for state tracking (e.g., counting calls)
  onOperation(operation: string, callback: (arg?: unknown) => void) {
    this._callbacks.set(operation, callback)
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setState(key: string, value: any) {
    this._state[key] = value
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState(key: string): any {
    return this._state[key]
  }

  // Build the chainable object with all Supabase methods
  build() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const chainMethods = [
      'select', 'insert', 'update', 'delete',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'like', 'ilike', 'in', 'contains',
      'order', 'limit', 'offset'
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {}

    // Add chainable methods
    chainMethods.forEach((method) => {
      obj[method] = jest.fn(function () {
        return this
      })
    })

    // Add terminal operations
    obj.single = jest.fn(async function () {
      self._callbacks.get('single')?.()
      return { data: self._data, error: self._error }
    })

    obj.maybeSingle = jest.fn(async function () {
      self._callbacks.get('maybeSingle')?.()
      return { data: self._data, error: self._error }
    })

    obj.upsert = jest.fn(async function (data: unknown) {
      self._callbacks.get('upsert')?.({ data })
      return { data: { ...(data as Record<string, unknown>), id: 'generated_' + Date.now() }, error: null }
    })

    obj.then = jest.fn(async function () {
      return { data: self._data, error: self._error }
    })

    obj.catch = jest.fn(function () {
      return this
    })

    obj.finally = jest.fn(function () {
      return this
    })

    return obj
  }
}

/**
 * Creates a chainable Supabase query builder mock
 * Supports: select, eq, gte, lte, gt, lt, order, single, etc.
 */
export class MockQueryBuilderFactory {
  private _data: MockTableRow | MockTableRow[] | null = null
  private _error: Error | null = null

  static create() {
    return new MockQueryBuilderFactory()
  }

  withData(data: MockTableRow | MockTableRow[] | null) {
    this._data = data
    return this
  }

  withError(error: Error | null) {
    this._error = error
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build(): any {
    const data = this._data
    const error = this._error

    return {
      select: jest.fn(function () {
        return this
      }),
      eq: jest.fn(function () {
        return this
      }),
      neq: jest.fn(function () {
        return this
      }),
      gt: jest.fn(function () {
        return this
      }),
      gte: jest.fn(function () {
        return this
      }),
      lt: jest.fn(function () {
        return this
      }),
      lte: jest.fn(function () {
        return this
      }),
      like: jest.fn(function () {
        return this
      }),
      ilike: jest.fn(function () {
        return this
      }),
      order: jest.fn(function () {
        return this
      }),
      limit: jest.fn(function () {
        return this
      }),
      offset: jest.fn(function () {
        return this
      }),
      single: jest.fn(async function () {
        return { data, error }
      }),
      maybeSingle: jest.fn(async function () {
        return { data, error }
      }),
      then: jest.fn(async function () {
        return { data, error }
      }),
      catch: jest.fn(function () {
        return this
      }),
      finally: jest.fn(function () {
        return this
      }),
    }
  }
}

/**
 * Creates a mock Supabase table with configurable responses
 */
export class MockSupabaseTableFactory {
  private _responseMap: Map<string, MockQueryBuilder> = new Map()
  private _defaultResponse: MockQueryBuilder = { data: null, error: null }

  static create() {
    return new MockSupabaseTableFactory()
  }

  when(condition: string, response: MockQueryBuilder) {
    this._responseMap.set(condition, response)
    return this
  }

  withDefault(response: MockQueryBuilder) {
    this._defaultResponse = response
    return this
  }

  build() {
    const responseMap = this._responseMap
    const defaultResponse = this._defaultResponse

     
    return jest.fn((table: string) => {
      // For specific table lookups
      if (responseMap.has(table)) {
        const response = responseMap.get(table)!
        return MockQueryBuilderFactory.create()
          .withData(response.data)
          .withError(response.error)
          .build()
      }

      // Default chainable query builder
      return MockQueryBuilderFactory.create()
        .withData(defaultResponse.data)
        .withError(defaultResponse.error)
        .build()
    })
  }
}

/**
 * Creates a complete mock Supabase admin client
 *
 * Supports two modes:
 * 1. Static tables (same response for all queries on that table)
 * 2. Dynamic handler (custom logic per test)
 *
 * Usage:
 * ```typescript
 * // Static mode
 * const mockSupabase = MockSupabaseClientFactory.create()
 *   .setupTable('properties', {
 *     data: { id: 'prop_123', max_guests: 4 },
 *     error: null
 *   })
 *   .build()
 *
 * // Dynamic mode (for complex tests)
 * const mockSupabase = MockSupabaseClientFactory.create()
 *   .withDynamicHandler((table, operation) => {
 *     if (table === 'properties' && operation === 'single') {
 *       return { data: { id: 'prop_123' }, error: null }
 *     }
 *     return { data: null, error: null }
 *   })
 *   .build()
 * ```
 */
export class MockSupabaseClientFactory {
  private _tables: Map<string, MockQueryBuilder> = new Map()
   
  private _dynamicHandler: ((table: string, operation: string) => MockQueryBuilder) | null = null

  static create() {
    return new MockSupabaseClientFactory()
  }

  setupTable(tableName: string, response: MockQueryBuilder) {
    this._tables.set(tableName, response)
    return this
  }

  withDynamicHandler(handler: (table: string, operation: string) => MockQueryBuilder) {
    this._dynamicHandler = handler
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupPropertyListings(data: any = null) {
    this._tables.set('property_listings', {
      data: data || {
        external_property_id: 'booking_prop_123',
        property_id: 'prop_123',
        properties: { id: 'prop_123', max_guests: 4 },
      },
      error: null,
    })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupProperties(data: any = null) {
    this._tables.set('properties', {
      data: data || { id: 'prop_123', max_guests: 4 },
      error: null,
    })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupPricingRules(data: any[] = []) {
    this._tables.set('pricing_rules', {
      data: data,
      error: null,
    })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupPropertyAvailability(data: any[] = []) {
    this._tables.set('property_availability', {
      data: data,
      error: null,
    })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupOrganizations(data: any = null) {
    this._tables.set('organizations', {
      data: data || { id: 'org_123', subscription_plan: 'professional' },
      error: null,
    })
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build(): any {
    const tables = this._tables

    return {
      from: jest.fn((table: string) => {
        const response = tables.get(table) || { data: null, error: null }

        return {
          select: jest.fn(function () {
            return this
          }),
          insert: jest.fn(function () {
            return this
          }),
          update: jest.fn(function () {
            return this
          }),
          delete: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          neq: jest.fn(function () {
            return this
          }),
          gt: jest.fn(function () {
            return this
          }),
          gte: jest.fn(function () {
            return this
          }),
          lt: jest.fn(function () {
            return this
          }),
          lte: jest.fn(function () {
            return this
          }),
          like: jest.fn(function () {
            return this
          }),
          ilike: jest.fn(function () {
            return this
          }),
          in: jest.fn(function () {
            return this
          }),
          contains: jest.fn(function () {
            return this
          }),
          order: jest.fn(function () {
            return this
          }),
          limit: jest.fn(function () {
            return this
          }),
          offset: jest.fn(function () {
            return this
          }),
          single: jest.fn(async function () {
            return response
          }),
          maybeSingle: jest.fn(async function () {
            return response
          }),
          then: jest.fn(async function () {
            return response
          }),
          catch: jest.fn(function () {
            return this
          }),
          finally: jest.fn(function () {
            return this
          }),
        }
      }),
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: 'user_123' } },
          error: null,
        })),
        getSession: jest.fn(async () => ({
          data: { session: { access_token: 'test-token' } },
          error: null,
        })),
      },
    }
  }
}

/**
 * Jest mock setup helper
 * Call this in test file setup to mock createAdminClient
 */
export function setupSupabaseAdminMock(
  clientFactory: MockSupabaseClientFactory
): void {
  jest.mock('@/lib/supabase/admin', () => ({
    createAdminClient: jest.fn(() => clientFactory.build()),
  }))
}
