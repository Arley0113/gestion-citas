import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (import.meta.env.DEV) console.warn("⚠️  Faltan variables de entorno Supabase — configura .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
