import type { StorageAdapter } from './types';
import { createLocalStorageAdapter } from './localStorage';

export function getStorageAdapter(userId: string): StorageAdapter {
  return createLocalStorageAdapter(userId);
}

export type { StorageAdapter } from './types';
