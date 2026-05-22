import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseServerConfigured =
  Boolean(supabaseUrl) &&
  Boolean(serviceRoleKey) &&
  !supabaseUrl.startsWith("your_") &&
  !serviceRoleKey.startsWith("your_");

export const supabaseAdmin = isSupabaseServerConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export async function verifySupabaseToken(token) {
  if (!supabaseAdmin || !token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  const user = data.user;
  return {
    id: user.id,
    userId: user.id,
    contact: (user.email || user.phone || "").toLowerCase(),
    email: user.email || "",
    phone: user.phone || "",
    provider: "supabase",
  };
}
