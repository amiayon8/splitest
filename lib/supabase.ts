import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function isValidConfig(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();
  if (!trimmedUrl || !trimmedKey) return false;
  if (trimmedUrl.includes('your-project') || trimmedKey.includes('your-anon-key')) return false;
  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getStoredSupabaseConfig(): SupabaseConfig | null {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isValidConfig(envUrl, envKey)) {
    return { url: envUrl!.trim(), anonKey: envKey!.trim() };
  }

  if (typeof window !== 'undefined') {
    const localStored = window.localStorage.getItem('splitest_supabase_credentials');
    if (localStored) {
      try {
        const parsed = JSON.parse(localStored);
        if (isValidConfig(parsed.url, parsed.anonKey)) {
          return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
        }
      } catch {
        window.localStorage.removeItem('splitest_supabase_credentials');
      }
    }
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getStoredSupabaseConfig() !== null;
}

export function saveSupabaseConfig(config: SupabaseConfig | null): void {
  if (typeof window === 'undefined') return;

  if (config && isValidConfig(config.url, config.anonKey)) {
    window.localStorage.setItem('splitest_supabase_credentials', JSON.stringify(config));
  } else {
    window.localStorage.removeItem('splitest_supabase_credentials');
  }
  cachedClient = null;
  cachedConfigKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config) {
    return null;
  }

  const currentKey = `${config.url}:::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch {
    return null;
  }
}
