import type { StorageAdapter } from './types';
import { createLocalStorageAdapter } from './localStorage';
import { createFirestoreAdapter } from './firestoreStorage';
import { db, isAuthEnabled } from '../firebase/config';

export function getStorageAdapter(userId: string): StorageAdapter {
  // Use Firestore in production (when auth is enabled), localStorage otherwise
  if (isAuthEnabled && db) {
    return createFirestoreAdapter(db, userId);
  }
  return createLocalStorageAdapter(userId);
}

export type { StorageAdapter } from './types';
