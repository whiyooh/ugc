import { useState, type FormEvent } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { publicAsset } from "../../utils/assets"

type AuthView = "login" | "signup" | "recovery" | "update-password"

type AuthScreenProps = {
  client: SupabaseClient | null
  configurationError: string | null
  recovery: boolean
  sessionError: string
  onPreview?: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação. Tente novamente."
}

export function AuthScreen({
  client,
  configurationError,
  recovery,
  sessionError,
  onPreview,
}: AuthScreenProps) {
  const [view, setView] = useState<AuthView>(
    recovery ? "update-password" : "login",
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const changeView = (nextView: AuthView) => {
    setView(nextView)
    setError("")
    setMessage("")
    setPassword("")
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (!client) {
      setError(configurationError ?? "O Supabase não está configurado.")
      return
    }

    setBusy(true)
    try {
      if (view === "login") {
        const { error: loginError } = await client.auth.signInWithPassword({
          email,
          password,
        })
        if (loginError) throw loginError
      } else if (view === "signup") {
        const { data, error: signupError } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          },
        })
        if (signupError) throw signupError
        if (!data.session) {
          setMessage(
            "Cadastro recebido. Confirme seu e-mail pelo link enviado para concluir a entrada.",
          )
        }
      } else if (view === "recovery") {
        const { error: recoveryError } =
          await client.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          })
        if (recoveryError) throw recoveryError
        setMessage(
          "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
        )
      } else {
        const { error: passwordError } = await client.auth.updateUser({
          password,
        })
        if (passwordError) throw passwordError
        setView("login")
        setPassword("")
        setMessage("Senha atualizada com sucesso.")
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const heading =
    view === "signup"
      ? "Crie sua conta"
      : view === "recovery"
        ? "Recupere o acesso"
        : view === "update-password"
          ? "Defina uma nova senha"
          : "Entre no seu espaço"

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-brand">
          <span className="brand-symbol">
            <img
              className="icon"
              src={publicAsset("/assets/f3466.svg")}
              alt=""
            />
          </span>
          <span>
            <strong>UGC AI YOHS</strong>
            <small>CREATOR HUB</small>
          </span>
        </div>
        <span className="eyebrow">SEU ESPAÇO DE CRIAÇÃO</span>
        <h1 id="auth-heading">{heading}</h1>
        <p className="auth-intro">
          Organize suas campanhas UGC com seus dados privados na nuvem.
        </p>

        {configurationError && (
          <div className="auth-error" role="alert">
            <strong>Configuração necessária</strong>
            <p>{configurationError}</p>
            <p>
              Localmente, copie <code>.env.example</code> para{" "}
              <code>.env.local</code> e reinicie o servidor. No GitHub Pages,
              adicione as variáveis nas configurações do repositório e execute
              uma nova publicação.
            </p>
            {onPreview && (
              <button
                className="button button-secondary auth-preview-button"
                type="button"
                onClick={onPreview}
              >
                Abrir preview visual
              </button>
            )}
          </div>
        )}
        {sessionError && (
          <div className="auth-error" role="alert">
            <p>{sessionError}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Verificar sessão novamente
            </button>
          </div>
        )}

        {!configurationError && (
          <form className="auth-form" onSubmit={submit}>
            {view !== "update-password" && (
              <label className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}
            {view !== "recovery" && (
              <label className="field">
                <span>
                  {view === "update-password" ? "Nova senha" : "Senha"}
                </span>
                <input
                  type="password"
                  autoComplete={
                    view === "update-password"
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="auth-message" role="status">
                {message}
              </p>
            )}
            <button
              className="button button-primary auth-submit"
              disabled={busy}
            >
              {busy
                ? "Aguarde..."
                : view === "signup"
                  ? "Criar conta"
                  : view === "recovery"
                    ? "Enviar link de recuperação"
                    : view === "update-password"
                      ? "Salvar nova senha"
                      : "Entrar"}
            </button>
          </form>
        )}

        {!configurationError && !recovery && (
          <div className="auth-links">
            {view === "login" ? (
              <>
                <button type="button" onClick={() => changeView("recovery")}>
                  Esqueci minha senha
                </button>
                <span>
                  Ainda não tem conta?{" "}
                  <button type="button" onClick={() => changeView("signup")}>
                    Criar conta
                  </button>
                </span>
              </>
            ) : (
              <button type="button" onClick={() => changeView("login")}>
                Voltar para entrar
              </button>
            )}
          </div>
        )}
      </section>
      <p className="auth-footer">
        Seus dados são isolados por conta e protegidos no banco de dados.
      </p>
    </main>
  )
}
