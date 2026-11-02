'use client';

import { createBrowserClient } from '@supabase/ssr';

const defaultUrl = 'https://dgshmayyvunzemmgcnro.supabase.co';
const defaultAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnc2htYXl5dnVuemVtbWdjbnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MTYxNDMsImV4cCI6MjEwNDE5MjE0M30.93246pSXciyr-vORRQX_9TuziO3IIq0UCxrcxJoo7o0';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnon;
  return createBrowserClient(url, key);
}
