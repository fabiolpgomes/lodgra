// Mock for next/navigation (used in components and pages)
import { jest } from '@jest/globals';

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}));

export const usePathname = jest.fn(() => '/');

export const useSearchParams = jest.fn(() => new URLSearchParams());

export const useParams = jest.fn(() => ({}));

export const redirect = jest.fn((url: string) => {
  throw new Error(`Redirect to ${url}`);
});

export const notFound = jest.fn(() => {
  throw new Error('Not found');
});
