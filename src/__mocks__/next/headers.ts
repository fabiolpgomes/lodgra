// Mock for next/headers (used in server functions)
import { jest } from '@jest/globals';

export const cookies = jest.fn(async () => ({
  get: jest.fn((name: string) => ({ name, value: 'mock-value' })),
  getAll: jest.fn(() => []),
  has: jest.fn(() => false),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
}));

export const headers = jest.fn(() => ({
  get: jest.fn(() => 'mock-header-value'),
  getSetCookie: jest.fn(() => []),
  has: jest.fn(() => false),
  entries: jest.fn(() => []),
  forEach: jest.fn(),
  keys: jest.fn(() => []),
  values: jest.fn(() => []),
}));
