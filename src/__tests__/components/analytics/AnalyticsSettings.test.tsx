import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsSettingsClient from '@/components/analytics/AnalyticsSettingsClient';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AnalyticsSettingsClient', () => {
  // Track fetch calls to mock different endpoints
  let fetchCallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchCallCount = 0;

    // Default fetch implementation — handles both GET (config) and POST (submit)
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/api/analytics/config')) {
        // Initial config fetch on mount
        return {
          ok: true,
          json: async () => ({
            data: {
              ga_configured: false,
            },
          }),
        } as Response;
      }
      // Default response for other endpoints
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as Response;
    });
  });

  describe('Initial Load', () => {
    it('should fetch and display config on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '123',
            tenant_id: 'tenant-1',
            ga_enabled: true,
            ga_configured: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        }),
      } as Response);

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByText('Connected ✓')).toBeInTheDocument();
      });
    });

    it('should show form when GA not configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ga_configured: false,
          },
        }),
      } as Response);

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('G-XXXXXXXXXX')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should validate GA ID format', async () => {
      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('G-XXXXXXXXXX')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('G-XXXXXXXXXX');
      const button = screen.getByRole('button', { name: /connect ga/i });

      await userEvent.type(input, 'invalid-ga-id');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/invalid ga measurement id format/i)).toBeInTheDocument();
      });
    });

    it('should accept valid GA ID format', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/analytics/config')) {
          return {
            ok: true,
            json: async () => ({
              data: { ga_configured: false },
            }),
          } as Response;
        }
        // POST response for save
        return {
          ok: true,
          json: async () => ({
            data: {
              id: '123',
              tenant_id: 'tenant-1',
              ga_enabled: true,
              ga_configured: true,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          }),
        } as Response;
      });

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('G-XXXXXXXXXX')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('G-XXXXXXXXXX');
      const button = screen.getByRole('button', { name: /connect ga/i });

      await userEvent.type(input, 'G-1234567890');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Connected ✓')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/api/analytics/config')) {
          return {
            ok: true,
            json: async () => ({
              data: { ga_configured: false },
            }),
          } as Response;
        }
        // Error response for POST
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Invalid GA ID',
          }),
        } as Response;
      });

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('G-XXXXXXXXXX')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('G-XXXXXXXXXX');
      const button = screen.getByRole('button', { name: /connect ga/i });

      await userEvent.type(input, 'G-1234567890');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Invalid GA ID')).toBeInTheDocument();
      });
    });

    it('should show loading state while submitting', async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ data: { ga_configured: true } }),
        }), 1000)
      );

      mockFetch.mockReturnValueOnce(slowPromise as Promise<Response>);

      render(<AnalyticsSettingsClient />);

      const input = screen.getByPlaceholderText('G-XXXXXXXXXX');
      const button = screen.getByRole('button', { name: /connect ga/i });

      await userEvent.type(input, 'G-1234567890');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });
  });

  describe('Connected State Actions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '123',
            tenant_id: 'tenant-1',
            ga_enabled: true,
            ga_configured: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        }),
      } as Response);
    });

    it('should test connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            test_event_id: 'test-123',
            instructions: 'Check GA in 5-10 seconds',
          },
        }),
      } as Response);

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        const testButton = screen.getByRole('button', { name: /test connection/i });
        expect(testButton).toBeInTheDocument();
      });

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics/test', { method: 'POST' });
      });
    });

    it('should disconnect GA', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ga_configured: false },
        }),
      } as Response);

      window.confirm = jest.fn(() => true);

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        const disconnectButton = screen.getByRole('button', { name: /disconnect ga/i });
        expect(disconnectButton).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole('button', { name: /disconnect ga/i });
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics/config', { method: 'DELETE' });
      });
    });

    it('should show success message on disconnect', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ga_configured: false },
        }),
      } as Response);

      window.confirm = jest.fn(() => true);

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        const disconnectButton = screen.getByRole('button', { name: /disconnect ga/i });
        fireEvent.click(disconnectButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/ga settings cleared/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { ga_configured: false },
        }),
      } as Response);
    });

    it('should have proper labels for form inputs', async () => {
      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        const label = screen.getByLabelText('GA Measurement ID');
        expect(label).toBeInTheDocument();
      });
    });

    it('should have aria-label on input', async () => {
      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        const input = screen.getByLabelText('Google Analytics Measurement ID');
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AnalyticsSettingsClient />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument();
      });
    });
  });
});
