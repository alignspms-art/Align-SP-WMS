import { createClient } from '@supabase/supabase-js';

// Helper to safely get environment variables in Vite
const getEnv = (key: string): string => {
  try {
    return import.meta.env[key] || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://ltnnrizdxiekcfnaxkpq.supabase.co';
const supabaseKey = getEnv('VITE_SUPABASE_KEY') || 'sb_publishable_AiUwf7Mr_OxURCGS0kf4IA_ob9PgYko';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);