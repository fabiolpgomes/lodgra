/**
 * Universal mock for Supabase admin client
 * Handles chainable queries with proper data returns
 */

export function createSupabaseAdminMock(defaultData: Record<string, any> = {}) {
  const createChainableMock = (table: string, data: any = null) => {
    const query: any = {
      select: jest.fn(function () {
        return this
      }),
      eq: jest.fn(function () {
        return this
      }),
      neq: jest.fn(function () {
        return this
      }),
      in: jest.fn(function () {
        return this
      }),
      gte: jest.fn(function () {
        return this
      }),
      lte: jest.fn(function () {
        return this
      }),
      order: jest.fn(function () {
        return this
      }),
      limit: jest.fn(function () {
        return this
      }),
      single: jest.fn(async function () {
        return { data: data || defaultData[table] || null, error: null }
      }),
      maybeSingle: jest.fn(async function () {
        return { data: data || defaultData[table] || null, error: null }
      }),
      upsert: jest.fn(async function (insertData: any) {
        return { data: { ...insertData, id: 'mock_' + Date.now() }, error: null }
      }),
      insert: jest.fn(async function (insertData: any) {
        return { data: insertData, error: null }
      }),
      delete: jest.fn(function () {
        return this
      }),
    }

    // Make the query itself awaitable for direct calls like `await adminClient.from('table').select(...)`
    return Object.assign(
      async function () {
        return { data: data || defaultData[table] || [], error: null }
      },
      query
    )
  }

  return {
    from: jest.fn((table: string) => createChainableMock(table, defaultData[table])),
  }
}
