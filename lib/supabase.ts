import { createClient } from "@supabase/supabase-js";

// Vite replaces import.meta.env dynamically at build time.
// Typescript expects these to be defined in vite/client types.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ltnnrizdxiekcfnaxkpq.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_AiUwf7Mr_OxURCGS0kf4IA_ob9PgYko";

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
