import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, supabaseConfigurationError } from "../lib/supabase"

type AuthContextValue = {
  client: typeof supabase
  configurationError: string | null
  user: User | null
  loading: boolean
  error: string
  passwordRecovery: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState("")
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true)
      } else if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        setPasswordRecovery(false)
      }
      setError("")
      setLoading(false)
    })

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        if (sessionError) {
          setError(
            `Não foi possível verificar sua sessão: ${sessionError.message}`,
          )
          return
        }
        setUser(data.session?.user ?? null)
      })
      .catch((sessionError: unknown) => {
        if (active) {
          const message =
            sessionError instanceof Error
              ? sessionError.message
              : "Erro desconhecido."
          setError(`Não foi possível verificar sua sessão: ${message}`)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      client: supabase,
      configurationError: supabaseConfigurationError,
      user,
      loading,
      error,
      passwordRecovery,
    }),
    [user, loading, error, passwordRecovery],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.")
  }
  return context
}
