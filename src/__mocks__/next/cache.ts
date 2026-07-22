// Mock for next/cache (used for revalidation)
import { jest } from '@jest/globals';

export const revalidatePath = jest.fn();
export const revalidateTag = jest.fn();
export const unstable_cache = jest.fn((fn: any) => fn);
