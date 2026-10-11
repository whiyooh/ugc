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
  ? "A variável VITE_SUPABASE_URL não foi definida. No preview local, preencha .env.local; no GitHub Pages, configure-a em Settings > Secrets and variables > Actions > Variables e publique novamente."
  : !isAllowedSupabaseUrl(url)
    ? "VITE_SUPABASE_URL precisa ser uma URL válida usando HTTPS (HTTP só é permitido em localhost)."
    : !anonKey
      ? "A variável VITE_SUPABASE_ANON_KEY não foi definida. Use a chave pública anon/publishable do Supabase; configure .env.local localmente ou uma Actions Variable no GitHub Pages."
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
