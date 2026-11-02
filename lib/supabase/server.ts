import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const defaultUrl = 'https://dgshmayyvunzemmgcnro.supabase.co';
const defaultAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2htYXl5dnVuemVtbWdjbnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTYxNDMsImV4cCI6MjEwNDE5MjE0M30.93246pSXciyr-vORRQX_9TuziO3IIq0UCxrcxJoo7o0';

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnon;

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}

// Service-role client for admin operations (seed, reconciliation)
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultAnon;
  return createSupabaseClient(url, key);
}
