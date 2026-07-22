// Mock for sharp (image processing library)
import { jest } from '@jest/globals';

const mockSharp = jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
  metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
}));

export default mockSharp;
