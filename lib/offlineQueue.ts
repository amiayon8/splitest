'use client';

import { useEffect, useState } from 'react';

const DATABASE_NAME = 'splitest_offline_cache';
const DATABASE_VERSION = 2;

export interface QueuedMutation {
  id: string;
  type:
    | 'create_expense'
    | 'update_expense'
    | 'delete_expense'
    | 'record_settlement'
    | 'create_group'
    | 'update_group'
    | 'delete_group'
    | 'send_chat_message'
    | 'toggle_chat_like'
    | 'add_comment'
    | 'update_profile'
    | 'add_friend';
  payload: Record<string, unknown>;
  timestamp: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const stores = [
        'groups',
        'expenses',
        'settlements',
        'chat_messages',
        'friends',
        'profiles',
        'activities',
        'mutations',
      ];
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
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
    return;
  }
}

export async function setCachedItem<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
  } catch {
    return;
  }
}

export async function deleteCachedItem(storeName: string, id: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
  } catch {
    return;
  }
}

export async function getCachedItems<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as T[]) || []);
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
    return;
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
    return;
  }
}

export async function clearPendingMutations(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction('mutations', 'readwrite');
    tx.objectStore('mutations').clear();
  } catch {
    return;
  }
}

export async function countPendingMutations(): Promise<number> {
  try {
    const items = await getPendingMutations();
    return items.length;
  } catch {
    return 0;
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
