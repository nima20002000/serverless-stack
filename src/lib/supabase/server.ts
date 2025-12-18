import 'server-only';
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required');
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
