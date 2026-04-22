import { createClient } from "@supabase/supabase-js";

// Service-role client for server-to-server use (Slack webhook).
// Bypasses RLS — NEVER import from client code or from a Route Handler
// that serves an unauthenticated browser request.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
