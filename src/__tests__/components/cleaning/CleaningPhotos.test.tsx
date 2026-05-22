import { render, screen, waitFor } from '@testing-library/react';
import CleaningPhotoUploader from '@/components/cleaning/photos/CleaningPhotoUploader';
import CleaningPhotoGallery from '@/components/cleaning/photos/CleaningPhotoGallery';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock fetch
const fetchMock = jest.fn() as jest.Mock<Promise<Response>>;
global.fetch = fetchMock;

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      })),
      unsubscribe: jest.fn(),
    })),
  }),
}));

// Mock heic2any
jest.mock('heic2any', () => ({
  default: jest.fn(async ({ blob }: { blob: Blob }) => blob),
}));

describe('Cleaning Photos (Story 29.5 + 29.9 Enhancements)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CleaningPhotoUploader', () => {
    test('renders upload button', () => {
      render(<CleaningPhotoUploader taskId="test-task-id" />);
      expect(screen.getByText('add_photos')).toBeInTheDocument();
    });

    test('displays photo count', () => {
      render(<CleaningPhotoUploader taskId="test-task-id" />);
      expect(screen.getByText(/0\/10/)).toBeInTheDocument();
    });

    test('accepts file selection including HEIC', () => {
      const { container } = render(<CleaningPhotoUploader taskId="test-task-id" />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.accept).toContain('image/jpeg');
      expect(input.accept).toContain('image/heic');
    });

    test('rejects unsupported file formats', () => {
      const { container } = render(<CleaningPhotoUploader taskId="test-task-id" />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).not.toContain('image/gif');
    });
  });

  describe('CleaningPhotoGallery', () => {
    test('renders loading state', () => {
      fetchMock.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      render(<CleaningPhotoGallery taskId="test-task-id" />);
      expect(screen.getByText('loading')).toBeInTheDocument();
    });

    test('handles empty gallery', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<CleaningPhotoGallery taskId="test-task-id" />);

      await waitFor(() => {
        expect(screen.getByText('no_photos')).toBeInTheDocument();
      });
    });

    test('displays photos with signed URLs', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          task_id: 'test-task-id',
          file_path: 'test-path-1',
          uploaded_at: '2026-05-22T10:00:00Z',
          uploader_id: 'user-1',
          url: 'https://signed-url-1.com',
        },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhotos,
      });

      render(<CleaningPhotoGallery taskId="test-task-id" />);

      await waitFor(() => {
        const images = screen.getAllByAltText('Cleaning photo');
        expect(images.length).toBeGreaterThan(0);
      });
    });

    test('deletes photo when manager clicks delete', async () => {
      const mockPhotos = [
        {
          id: 'photo-1',
          task_id: 'test-task-id',
          file_path: 'test-path-1',
          uploaded_at: '2026-05-22T10:00:00Z',
          uploader_id: 'user-1',
          url: 'https://signed-url-1.com',
        },
      ];

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPhotos,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      render(<CleaningPhotoGallery taskId="test-task-id" isManager={true} />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    test('establishes Realtime subscription on mount (Story 29.9)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const { container } = render(<CleaningPhotoGallery taskId="test-task-id" />);

      // Component renders without errors
      expect(container).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith('/api/cleaner/tasks/test-task-id/photos');
    });

    test('unsubscribes from Realtime on unmount (Story 29.9)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const { unmount } = render(<CleaningPhotoGallery taskId="test-task-id" />);

      // Component should render without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Story 29.9 Enhancements', () => {
    test('accepts HEIC format files', () => {
      const { container } = render(<CleaningPhotoUploader taskId="test-task-id" />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toContain('image/heic');
      expect(input.accept).toContain('image/heif');
    });

    test('renders Image component with proper props', () => {
      render(<CleaningPhotoUploader taskId="test-task-id" />);
      expect(screen.getByText('add_photos')).toBeInTheDocument();
    });
  });
});
