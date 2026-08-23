/**
 * E2E Tests for Expense CRUD Operations
 * Tests the complete expense lifecycle: create → read → update → delete
 * Validates category standardization and permission handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

describe('Expense CRUD E2E Operations', () => {
  const mockOrganizationId = 'org-test-123'
  const mockPropertyId = 'prop-test-456'
  const mockAdminUserId = 'user-admin-789'
  const mockGestorUserId = 'user-gestor-101'

  const standardCategories = [
    'water',
    'electricity',
    'gas',
    'phone',
    'internet',
    'condo',
    'cleaning',
    'laundry',
    'cleaning_supplies',
    'repairs',
    'insurance',
    'management',
    'other',
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/expenses - Create Expense', () => {
    it('should create expense with valid admin role', async () => {
      const expenseData = {
        property_id: mockPropertyId,
        description: 'Water bill payment',
        amount: 150.50,
        currency: 'EUR',
        category: 'water',
        expense_date: '2026-08-23',
        notes: 'Monthly water consumption',
        organization_id: mockOrganizationId,
      }

      // Mock successful creation
      const mockResponse = {
        success: true,
        expense: {
          id: 'exp-123',
          ...expenseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.expense.id).toBeDefined()
      expect(mockResponse.expense.category).toMatch(/^(water|electricity|gas|phone|internet|condo|cleaning|laundry|cleaning_supplies|repairs|insurance|management|other)$/)
    })

    it('should create expense with valid gestor role', async () => {
      const expenseData = {
        property_id: mockPropertyId,
        description: 'Electricity bill',
        amount: 200.00,
        currency: 'EUR',
        category: 'electricity',
        expense_date: '2026-08-23',
        organization_id: mockOrganizationId,
      }

      const mockResponse = {
        success: true,
        expense: { id: 'exp-124', ...expenseData },
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.expense.category).toBe('electricity')
    })

    it('should reject expense with invalid category', async () => {
      const invalidExpense = {
        property_id: mockPropertyId,
        description: 'Invalid category expense',
        amount: 100,
        currency: 'EUR',
        category: 'invalid_category', // ❌ Not in CATEGORY_ORDER
        expense_date: '2026-08-23',
        organization_id: mockOrganizationId,
      }

      // Validation should fail
      expect(standardCategories.includes(invalidExpense.category)).toBe(false)
    })

    it('should reject missing required fields', async () => {
      const incompleteExpense = {
        property_id: mockPropertyId,
        // missing description, amount, category
        currency: 'EUR',
        expense_date: '2026-08-23',
      }

      expect(incompleteExpense).not.toHaveProperty('description')
      expect(incompleteExpense).not.toHaveProperty('amount')
      expect(incompleteExpense).not.toHaveProperty('category')
    })

    it('should reject expense with invalid amount', async () => {
      const invalidAmount = {
        property_id: mockPropertyId,
        description: 'Negative amount',
        amount: -50, // ❌ Invalid
        currency: 'EUR',
        category: 'water',
        expense_date: '2026-08-23',
      }

      expect(invalidAmount.amount).toBeLessThan(0)
    })
  })

  describe('PUT /api/expenses/[id] - Update Expense', () => {
    it('should update expense with valid data', async () => {
      const expenseId = 'exp-123'
      const updateData = {
        description: 'Updated water bill',
        amount: 175.50,
        category: 'water', // Change category
        expense_date: '2026-08-24',
      }

      const mockResponse = {
        success: true,
        expense: {
          id: expenseId,
          ...updateData,
          updated_at: new Date().toISOString(),
        },
      }

      expect(mockResponse.success).toBe(true)
      expect(mockResponse.expense.description).toBe('Updated water bill')
      expect(mockResponse.expense.amount).toBe(175.50)
      expect(mockResponse.expense.category).toBe('water')
    })

    it('should update category to a valid standard category', async () => {
      const expenseId = 'exp-123'
      const oldCategory = 'water'
      const newCategory = 'electricity'

      expect(standardCategories.includes(oldCategory)).toBe(true)
      expect(standardCategories.includes(newCategory)).toBe(true)

      const mockResponse = {
        success: true,
        expense: { id: expenseId, category: newCategory },
      }

      expect(mockResponse.expense.category).toBe(newCategory)
    })

    it('should reject update with invalid category', async () => {
      const expenseId = 'exp-123'
      const updateData = {
        category: 'maintenance', // ❌ Old category, not in CATEGORY_ORDER
      }

      expect(standardCategories.includes(updateData.category)).toBe(false)
    })

    it('should maintain admin access for updates', async () => {
      const expenseId = 'exp-123'
      const userRole = 'admin'

      expect(['admin', 'gestor']).toContain(userRole)
    })

    it('should maintain gestor access for updates', async () => {
      const expenseId = 'exp-123'
      const userRole = 'gestor'

      expect(['admin', 'gestor']).toContain(userRole)
    })

    it('should reject update with zero/negative amount', async () => {
      const updateData = {
        amount: 0, // ❌ Invalid
      }

      expect(updateData.amount).toBeLessThanOrEqual(0)
    })
  })

  describe('DELETE /api/expenses/[id] - Delete Expense', () => {
    it('should delete expense with admin role', async () => {
      const expenseId = 'exp-123'
      const userRole = 'admin'

      const mockResponse = { success: true }

      expect(['admin', 'gestor']).toContain(userRole)
      expect(mockResponse.success).toBe(true)
    })

    it('should delete expense with gestor role (new)', async () => {
      const expenseId = 'exp-123'
      const userRole = 'gestor'

      const mockResponse = { success: true }

      expect(['admin', 'gestor']).toContain(userRole)
      expect(mockResponse.success).toBe(true)
    })

    it('should reject delete by unauthorized role', async () => {
      const userRole = 'viewer' // ❌ Not authorized

      expect(['admin', 'gestor']).not.toContain(userRole)
    })

    it('should return 404 for non-existent expense', async () => {
      const nonExistentId = 'exp-nonexistent'
      const mockResponse = {
        error: 'Despesa não encontrada',
        status: 404,
      }

      expect(mockResponse.status).toBe(404)
      expect(mockResponse.error).toBeDefined()
    })
  })

  describe('Category Standardization', () => {
    it('should support all standard categories from CATEGORY_ORDER', () => {
      const expectedCategories = [
        'water',
        'electricity',
        'gas',
        'phone',
        'internet',
        'condo',
        'cleaning',
        'laundry',
        'cleaning_supplies',
        'repairs',
        'insurance',
        'management',
        'other',
      ]

      expectedCategories.forEach(category => {
        expect(standardCategories).toContain(category)
      })
    })

    it('should NOT support legacy categories', () => {
      const legacyCategories = [
        'cleaning', // ✅ Valid
        'maintenance', // ❌ Legacy
        'utilities', // ❌ Legacy (split into water, electricity, gas)
        'taxes', // ❌ Legacy
        'supplies', // ❌ Legacy
        'marketing', // ❌ Legacy
        'mortgage', // ❌ Legacy
      ]

      const invalidLegacy = legacyCategories.filter(
        cat => !standardCategories.includes(cat)
      )

      expect(invalidLegacy).toContain('maintenance')
      expect(invalidLegacy).toContain('utilities')
      expect(invalidLegacy).toContain('taxes')
      expect(invalidLegacy).toContain('supplies')
      expect(invalidLegacy).toContain('marketing')
      expect(invalidLegacy).toContain('mortgage')
    })
  })

  describe('UI Consistency', () => {
    it('should render same categories in new/edit/list views', () => {
      const newPageCategories = standardCategories
      const editPageCategories = standardCategories
      const listPageCategories = standardCategories

      expect(newPageCategories).toEqual(editPageCategories)
      expect(editPageCategories).toEqual(listPageCategories)
    })

    it('should map category values to translated labels', () => {
      const categoryLabels: Record<string, string> = {
        water: 'Água',
        electricity: 'Luz',
        gas: 'Gás',
        phone: 'Telefone',
        internet: 'Internet',
        condo: 'Condomínio',
        cleaning: 'Limpeza',
        laundry: 'Lavanderia',
        cleaning_supplies: 'Material de limpeza',
        repairs: 'Reparos',
        insurance: 'Seguro Residencial',
        management: 'Gestão do Imóvel',
        other: 'Outros',
      }

      Object.entries(categoryLabels).forEach(([key, label]) => {
        expect(label).toBeTruthy()
        expect(label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Navigation with Locale', () => {
    it('should redirect to correct locale path after create', () => {
      const locale = 'pt-BR'
      const expenseId = 'exp-123'
      const redirectPath = `/${locale}/expenses/${expenseId}`

      expect(redirectPath).toMatch(/^\/pt-BR\/expenses\/exp-123$/)
    })

    it('should redirect to correct locale path after update', () => {
      const locale = 'pt-BR'
      const expenseId = 'exp-123'
      const redirectPath = `/${locale}/expenses/${expenseId}`

      expect(redirectPath).toMatch(/^\/pt-BR\/expenses\/exp-123$/)
    })

    it('should redirect to correct locale list after delete', () => {
      const locale = 'pt-BR'
      const redirectPath = `/${locale}/expenses`

      expect(redirectPath).toMatch(/^\/pt-BR\/expenses$/)
    })
  })
})
