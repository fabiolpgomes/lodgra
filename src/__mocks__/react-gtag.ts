// Mock for react-gtag (Google Analytics)
import { jest } from '@jest/globals';

export const usePageViews = jest.fn();
export const useEvent = jest.fn(() => jest.fn());
