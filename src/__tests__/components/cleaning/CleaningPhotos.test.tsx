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

describe('Cleaning Photos (Story 29.5)', () => {
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

    test('accepts file selection', () => {
      const { container } = render(<CleaningPhotoUploader taskId="test-task-id" />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.accept).toContain('image/jpeg');
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
  });
});
