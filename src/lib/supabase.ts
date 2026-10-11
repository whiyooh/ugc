import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isAllowedSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return (
      parsed.protocol === "https:" ||
      (parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname))
    )
  } catch {
    return false
  }
}

export const supabaseConfigurationError = !url
  ? "Configure VITE_SUPABASE_URL no arquivo .env.local."
  : !isAllowedSupabaseUrl(url)
    ? "VITE_SUPABASE_URL deve usar HTTPS (HTTP só é permitido em localhost)."
    : !anonKey
      ? "Configure VITE_SUPABASE_ANON_KEY no arquivo .env.local."
      : null

export const supabase =
  !supabaseConfigurationError && url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null

export const WORKSPACE_IMAGE_BUCKET = "workspace-images"
