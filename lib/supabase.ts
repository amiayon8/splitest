import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (envUrl && envKey && !envUrl.includes('your-project')) {
      return { url: envUrl, anonKey: envKey };
    }
    return null;
  }

  const localStored = window.localStorage.getItem('splitest_supabase_credentials');
  if (localStored) {
    try {
      const parsed = JSON.parse(localStored);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    } catch {
      window.localStorage.removeItem('splitest_supabase_credentials');
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, anonKey: envKey };
  }

  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig | null): void {
  if (typeof window === 'undefined') return;

  if (config && config.url && config.anonKey) {
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
