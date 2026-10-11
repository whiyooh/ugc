import type { ReactNode } from "react"
import { Icon, Tag } from "./ui"
import { icons, pageNames, type Page } from "../app/navigation"

export function Header({
  page,
  search,
  setSearch,
  onMenu,
  email,
  saving,
  lastSavedAt,
  error,
  onLogout,
  onRetrySave,
  loggingOut,
  preview,
}: {
  page: Page
  search: string
  setSearch: (value: string) => void
  onMenu: () => void
  email: string
  saving: boolean
  lastSavedAt: string | null
  error: string
  onLogout: () => void
  onRetrySave: () => void
  loggingOut: boolean
  preview: boolean
}) {
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenu} aria-label="Abrir menu">
        Menu
      </button>
      <span className="breadcrumb">
        Meu espaço&nbsp;&nbsp;/&nbsp;&nbsp;{pageNames[page]}
      </span>
      <div className="top-actions">
        <label className="search">
          <Icon src="/assets/9a56d.svg" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no hub"
          />
        </label>
        <span className="save-status" role="status" aria-live="polite">
          {preview
            ? "Preview visual"
            : saving
              ? "Salvando na nuvem..."
              : error
                ? "Falha ao salvar"
                : lastSavedAt
                  ? `Salvo às ${new Date(lastSavedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Carregando dados"}
        </span>
        {error && (
          <button className="save-retry" onClick={onRetrySave}>
            Tentar novamente
          </button>
        )}
        <span className="user-email" title={email}>
          {email}
        </span>
        <button
          className="logout-button"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {preview ? "Sair do preview" : loggingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  )
}

export function Sidebar({
  page,
  setPage,
  open,
  close,
  preview,
}: {
  page: Page
  setPage: (page: Page) => void
  open: boolean
  close: () => void
  preview: boolean
}) {
  const navigate = (next: Page) => {
    setPage(next)
    close()
  }
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <button className="sidebar-close" onClick={close}>
        Fechar
      </button>
      <button className="brand" onClick={() => navigate("dashboard")}>
        <span className="brand-symbol">
          <Icon src="/assets/f3466.svg" />
        </span>
        <span>
          <strong>UGC AI YOHS</strong>
          <small>CREATOR HUB</small>
        </span>
      </button>
      <nav>
        <span className="nav-label">ESPAÇO DE CRIAÇÃO</span>
        {([
          "dashboard",
          "products",
          "creators",
          "copies",
          "videos",
          "references",
          "feedbacks",
          "drafts",
          "template",
        ] as Page[]).map((item) => (
          <button
            key={item}
            className={`nav-item ${page === item ? "active" : ""}`}
            onClick={() => navigate(item)}
          >
            <Icon src={icons[item]} />
            <span>{pageNames[item]}</span>
          </button>
        ))}
      </nav>
      <div className="side-note">
        <Tag tone="purple">
          {preview ? "Preview visual" : "Seu fluxo, mais leve"}
        </Tag>
        <strong>
          Da ideia ao vídeo.
          <br />
          Tudo no mesmo lugar.
        </strong>
        <p>
          {preview
            ? "Dados de demonstração para visualizar a interface."
            : "Seu espaço privado para organizar a produção."}
        </p>
      </div>
      <div className="side-meta">
        <strong>{preview ? "MODO DEMONSTRAÇÃO" : "ESPAÇO PRIVADO"}</strong>
        <span>
          {preview
            ? "Alterações não são salvas."
            : "Dados separados por conta."}
          <br />
          {preview ? "Use o login para sua conta." : "Você controla o acesso."}
        </span>
        <span>UGC AI YOHS&nbsp;&nbsp;•&nbsp;&nbsp;Português (BR)</span>
      </div>
    </aside>
  )
}

export function PageTitle({
  area,
  title,
  subtitle,
  action,
}: {
  area: string
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">
          ÁREA {area}&nbsp;&nbsp;/&nbsp;&nbsp;UGC AI CREATOR HUB
        </span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  )
}
