import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Please check .env.local and restart npm run dev.'
  );
}

if (!supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_PUBLISHABLE_KEY. Please check .env.local and restart npm run dev.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);