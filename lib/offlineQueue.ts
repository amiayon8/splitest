'use client';

import { useEffect, useState } from 'react';

const DB_NAME = 'splitest_offline_cache';
const DB_VERSION = 1;

export interface QueuedMutation {
  id: string;
  type: 'create_expense' | 'update_expense' | 'delete_expense' | 'record_settlement' | 'create_group';
  payload: Record<string, unknown>;
  timestamp: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('groups')) {
        db.createObjectStore('groups', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('expenses')) {
        db.createObjectStore('expenses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settlements')) {
        db.createObjectStore('settlements', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheItems<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
  } catch {
    // Graceful fallback if indexedDB unavailable
  }
}

export async function getCachedItems<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function queueMutation(mutation: QueuedMutation): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('mutations', 'readwrite');
    tx.objectStore('mutations').put(mutation);
  } catch {
    // Graceful fallback
  }
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  return getCachedItems<QueuedMutation>('mutations');
}

export async function removePendingMutation(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('mutations', 'readwrite');
    tx.objectStore('mutations').delete(id);
  } catch {
    // Graceful fallback
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
