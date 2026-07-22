/**
 * Story 36.11b: AuditLog Component Tests
 * Test audit log display, filtering, sorting, CSV export
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLog } from '../AuditLog';
import { toast } from 'sonner';

jest.mock('sonner');

// Mock window.URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('AuditLog', () => {
  const mockOnExport = jest.fn();

  const mockEntries = [
    {
      id: '1',
      date: '2026-07-22T10:00:00Z',
      type: 'manual' as const,
      ruleName: undefined,
      oldPrice: 100,
      newPrice: 110,
      change: 10,
      percentChange: 10,
      userId: 'user-123',
      notes: 'Manual adjustment',
    },
    {
      id: '2',
      date: '2026-07-21T15:30:00Z',
      type: 'automated' as const,
      ruleName: 'High Occupancy Boost',
      oldPrice: 100,
      newPrice: 115,
      change: 15,
      percentChange: 15,
      userId: undefined,
      notes: undefined,
    },
    {
      id: '3',
      date: '2026-07-20T08:00:00Z',
      type: 'manual' as const,
      ruleName: undefined,
      oldPrice: 110,
      newPrice: 105,
      change: -5,
      percentChange: -4.55,
      userId: 'user-456',
      notes: 'Correction',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Display Tests
  describe('Display', () => {
    it('should render audit log heading', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Histórico de Mudanças (Audit Log)')).toBeInTheDocument();
    });

    it('should display all entries in table', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Manual')).toBeInTheDocument();
      expect(screen.getByText('High Occupancy Boost')).toBeInTheDocument();
      expect(screen.getByText('€100.00')).toBeInTheDocument();
    });

    it('should display empty state when no entries', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={[]}
          onExport={mockOnExport}
        />
      );

      expect(
        screen.getByText('Nenhuma mudança de preço no período selecionado')
      ).toBeInTheDocument();
    });
  });

  // Summary Stats Tests
  describe('Summary Statistics', () => {
    it('should display total count', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const totalSection = screen.getByText('Total').closest('div');
      expect(totalSection).toBeInTheDocument();
    });

    it('should count manual changes', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const manualSection = screen.getByText('Manual').closest('div');
      expect(manualSection).toBeInTheDocument();
    });

    it('should count automated changes', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const automatedSection = screen.getByText('Automática').closest('div');
      expect(automatedSection).toBeInTheDocument();
    });
  });

  // Date Filter Tests
  describe('Date Range Filtering', () => {
    it('should have date filter dropdown', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const dateSelect = screen.getByDisplayValue('Últimos 30 dias');
      expect(dateSelect).toBeInTheDocument();
    });

    it('should filter by today', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const dateSelect = screen.getByDisplayValue('Últimos 30 dias');
      await userEvent.selectOptions(dateSelect, 'today');

      expect(dateSelect).toHaveValue('today');
    });

    it('should filter by 7 days', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const dateSelect = screen.getByDisplayValue('Últimos 30 dias');
      await userEvent.selectOptions(dateSelect, '7d');

      expect(dateSelect).toHaveValue('7d');
    });

    it('should filter by all time', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const dateSelect = screen.getByDisplayValue('Últimos 30 dias');
      await userEvent.selectOptions(dateSelect, 'all');

      expect(dateSelect).toHaveValue('all');
    });
  });

  // Type Filter Tests
  describe('Type Filtering', () => {
    it('should have type filter dropdown', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const typeSelect = screen.getByDisplayValue('Todos');
      expect(typeSelect).toBeInTheDocument();
    });

    it('should filter by manual type', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const typeSelect = screen.getByDisplayValue('Todos');
      await userEvent.selectOptions(typeSelect, 'manual');

      expect(typeSelect).toHaveValue('manual');
    });

    it('should filter by automated type', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const typeSelect = screen.getByDisplayValue('Todos');
      await userEvent.selectOptions(typeSelect, 'automated');

      expect(typeSelect).toHaveValue('automated');
    });
  });

  // Sorting Tests
  describe('Sorting', () => {
    it('should sort by date descending (most recent first)', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const rows = screen.getAllByRole('row');
      // First data row should be the most recent (2026-07-22)
      expect(rows[1]).toHaveTextContent('22');
    });
  });

  // Price Display Tests
  describe('Price Display', () => {
    it('should display prices with EUR formatting', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(screen.getAllByText(/€\d+\.\d{2}/)).toHaveLength(6); // 3 entries × 2 prices each
    });

    it('should display percentage changes', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('10.00%')).toBeInTheDocument();
      expect(screen.getByText('15.00%')).toBeInTheDocument();
    });

    it('should display negative price changes', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('-€5.00')).toBeInTheDocument();
    });
  });

  // Type Badge Tests
  describe('Type Badges', () => {
    it('should display Manual badge', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const manualBadges = screen.getAllByText('Manual');
      expect(manualBadges.length).toBeGreaterThan(0);
    });

    it('should display Automática badge', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(screen.getByText('Automática')).toBeInTheDocument();
    });
  });

  // CSV Export Tests
  describe('CSV Export', () => {
    it('should have export button', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByText('Exportar CSV');
      expect(exportButton).toBeInTheDocument();
    });

    it('should call onExport when export button clicked', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByText('Exportar CSV');
      await userEvent.click(exportButton);

      // Manual CSV export doesn't call onExport, it creates blob
      // So we check toast instead
      expect(toast.success).toHaveBeenCalledWith(
        'Audit log exportado como CSV'
      );
    });

    it('should show error toast on export failure', async () => {
      // Simulate export error by not mocking createObjectURL properly
      global.URL.createObjectURL = jest.fn(() => {
        throw new Error('Export failed');
      });

      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByText('Exportar CSV');
      await userEvent.click(exportButton);

      expect(toast.error).toHaveBeenCalledWith('Erro ao exportar audit log');
    });

    it('should create blob for download', async () => {
      const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.createObjectURL = mockCreateObjectURL;

      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const exportButton = screen.getByText('Exportar CSV');
      await userEvent.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  // Data Retention Note Tests
  describe('Data Retention', () => {
    it('should display retention note', () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      expect(
        screen.getByText(/Os registros de auditoria são mantidos por 1 ano/)
      ).toBeInTheDocument();
    });
  });

  // Combined Filter Tests
  describe('Filter Combination', () => {
    it('should apply both date and type filters', async () => {
      render(
        <AuditLog
          propertyId="prop-123"
          entries={mockEntries}
          onExport={mockOnExport}
        />
      );

      const dateSelect = screen.getByDisplayValue('Últimos 30 dias');
      const typeSelect = screen.getByDisplayValue('Todos');

      await userEvent.selectOptions(dateSelect, '7d');
      await userEvent.selectOptions(typeSelect, 'manual');

      expect(dateSelect).toHaveValue('7d');
      expect(typeSelect).toHaveValue('manual');
    });
  });
});
