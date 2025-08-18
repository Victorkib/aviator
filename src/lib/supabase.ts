import { Database } from '@/types/database';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for admin operations)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper function to get user session
export async function getServerSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
