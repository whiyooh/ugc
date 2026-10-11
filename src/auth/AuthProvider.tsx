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
  callbackError: string | null
  passwordRecovery: boolean
}

function getAuthCallbackError(): string | null {
  if (typeof window === "undefined") return null

  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const queryParams = new URLSearchParams(window.location.search)
  const errorCode =
    hashParams.get("error_code") ?? queryParams.get("error_code")
  const error = hashParams.get("error") ?? queryParams.get("error")

  if (!error && !errorCode) return null

  const description =
    hashParams.get("error_description") ?? queryParams.get("error_description")
  const message =
    errorCode === "otp_expired"
      ? "O link de confirmação é inválido ou expirou. Informe seu e-mail abaixo para solicitar um novo."
      : description
        ? `Não foi possível concluir a confirmação: ${description}`
        : "Não foi possível concluir a confirmação. Solicite um novo link e tente novamente."

  const url = new URL(window.location.href)
  url.hash = ""
  for (const key of ["error", "error_code", "error_description", "sb"]) {
    url.searchParams.delete(key)
  }
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}`,
  )

  return message
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState("")
  const [callbackError] = useState(getAuthCallbackError)
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
      callbackError,
      passwordRecovery,
    }),
    [user, loading, error, callbackError, passwordRecovery],
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
