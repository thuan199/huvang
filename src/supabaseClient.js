<<<<<<< HEAD
﻿import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('SUPABASE URL:', supabaseUrl);
console.log('SUPABASE KEY:', supabaseKey ? 'Loaded' : 'Missing');

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Please check .env.local and restart npm run dev.');
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY. Please check .env.local and restart npm run dev.');
}

=======
﻿import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('SUPABASE URL:', supabaseUrl);
console.log('SUPABASE KEY:', supabaseKey ? 'Loaded' : 'Missing');

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL. Please check .env.local and restart npm run dev.');
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY. Please check .env.local and restart npm run dev.');
}

>>>>>>> db3e27122ac47d7b56f57624925e9e828b678258
export const supabase = createClient(supabaseUrl, supabaseKey);