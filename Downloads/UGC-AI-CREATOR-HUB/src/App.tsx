import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { initialData, statusOrder } from "./data"
import type {
  AppData,
  Copy,
  Creator,
  Feedback,
  Product,
  Reference,
  Status,
  Video,
} from "./types"

type Page = "dashboard" | "products" | "creators" | "copies" | "videos" | "references" | "feedbacks" | "template"
type Collection = Exclude<keyof AppData, "completedSteps">

const STORAGE_KEY = "ugc-ai-creator-hub-v1"
const icons: Record<Page, string> = {
  dashboard: "/assets/66fc7.svg",
  products: "/assets/ed55a.svg",
  creators: "/assets/35f81.svg",
  copies: "/assets/cc31e.svg",
  videos: "/assets/91039.svg",
  references: "/assets/853de.svg",
  feedbacks: "/assets/5f8f1.svg",
  template: "/assets/e4950.svg",
}

const pageNames: Record<Page, string> = {
  dashboard: "Dashboard",
  products: "Produtos",
  creators: "Banco de criadoras IA",
  copies: "Biblioteca de copies",
  videos: "Video Lab",
  references: "Referências",
  feedbacks: "Feedbacks e resultados",
  template: "Template de campanha",
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatPrice(price: string) {
  const amount = Number(price.replace(",", "."))
  return Number.isFinite(amount)
    ? amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : price
}

function loadData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return initialData
    const parsed = JSON.parse(saved) as Partial<AppData>
    return {
      ...initialData,
      ...parsed,
      completedSteps: Array.isArray(parsed.completedSteps)
        ? parsed.completedSteps
        : [],
    }
  } catch (error) {
    console.error(
      "Não foi possível carregar os dados salvos do UGC AI Creator Hub.",
      error,
    )
    return initialData
  }
}

type IconProps = {
  src: string
  alt?: string
}

function Icon({ src, alt = "" }: IconProps) {
  return <img className="icon" src={src} alt={alt} />
}

function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      className={`button button-${variant}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: string
}) {
  return (
    <span
      className={`tag tag-${tone.toLowerCase().replace("ç", "c").replace("ã", "a")}`}
    >
      {children}
    </span>
  )
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`panel ${className}`}>{children}</section>
}

type EmptyProps = {
  title: string
  text: string
}

function Empty({ title, text }: EmptyProps) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Icon src="/assets/061b4.svg" />
      {children}
    </div>
  )
}

type Field = {
  key: string
  label: string
  type?: "text" | "number" | "textarea" | "select" | "url"
  options?: readonly string[]
  required?: boolean
}

function FormModal({
  title,
  fields,
  initial,
  onSave,
  onClose,
}: {
  title: string
  fields: Field[]
  initial: Record<string, string>
  onSave: (values: Record<string, string>) => void
  onClose: () => void
}) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState("")
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const invalidUrl = fields.find((field) => {
      if (field.type !== "url" || !values[field.key]) return false
      try {
        const url = new URL(values[field.key])
        return url.protocol !== "http:" && url.protocol !== "https:"
      } catch {
        return true
      }
    })
    if (invalidUrl) {
      setError(`${invalidUrl.label} deve começar com http:// ou https://.`)
      return
    }
    setError("")
    onSave(values)
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">UGC AI CREATOR HUB</span>
            <h2>{title}</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <form onSubmit={submit} className="form-grid">
          {fields.map((field) => (
            <label
              key={field.key}
              className={
                field.type === "textarea" ? "field field-wide" : "field"
              }
            >
              <span>{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                >
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  required={field.required}
                  min={field.type === "number" ? "0" : undefined}
                  step={field.type === "number" ? "0.01" : undefined}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Header({
  page,
  search,
  setSearch,
  onMenu,
}: {
  page: Page
  search: string
  setSearch: (value: string) => void
  onMenu: () => void
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
        <Tag>Template editável</Tag>
        <span className="avatar">EU</span>
      </div>
    </header>
  )
}

function Sidebar({
  page,
  setPage,
  open,
  close,
}: {
  page: Page
  setPage: (page: Page) => void
  open: boolean
  close: () => void
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
        <Tag tone="purple">Seu fluxo, mais leve</Tag>
        <strong>
          Da ideia ao vídeo.
          <br />
          Tudo no mesmo lugar.
        </strong>
        <p>Template editável para organizar sua produção com IA.</p>
      </div>
      <div className="side-meta">
        <strong>COLEÇÃO DEMONSTRATIVA</strong>
        <span>
          Produtos e perfis fictícios.
          <br />
          Nenhuma oferta real.
        </span>
        <span>Versão 01&nbsp;&nbsp;•&nbsp;&nbsp;Português (BR)</span>
      </div>
    </aside>
  )
}

function PageTitle({
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

function Dashboard({
  data,
  go,
  createCampaign,
  toggleStep,
}: {
  data: AppData
  go: (page: Page) => void
  createCampaign: () => void
  toggleStep: (id: string) => void
}) {
  return (
    <>
      <PageTitle
        area="01"
        title="Seu próximo vídeo começa aqui."
        subtitle="Uma visão clara do que criar, produzir e colocar no mundo."
        action={
          <Button onClick={createCampaign}>＋&nbsp; Nova campanha</Button>
        }
      />
      <section className="hero">
        <div>
          <span className="eyebrow">
            CRIAÇÃO COM IA, ORGANIZAÇÃO COM INTENÇÃO
          </span>
          <h2>
            Ideias soltas?
            <br />
            Transforme em conteúdo.
          </h2>
          <p>
            Seu estúdio de UGC para Shopee, TikTok Shop, Kwai e SHEIN. Conecte
            produtos, criadoras, copies e resultados em um só fluxo.
          </p>
          <div className="hero-actions">
            <Button onClick={() => go("template")}>
              Começar pelo template
            </Button>
            <Button variant="secondary" onClick={() => go("videos")}>
              Explorar o Video Lab
            </Button>
          </div>
        </div>
        <img
          src="/assets/b42d7.png"
          alt="Composição editorial de produtos em tons neutros e lilás"
        />
      </section>
      <div className="platform-grid">
        {["Shopee", "TikTok Shop", "Kwai", "SHEIN"].map((name, index) => (
          <button
            key={name}
            className="platform-card"
            onClick={() => go("products")}
          >
            <span className={`platform-icon platform-${index}`}>
              {index + 1}
            </span>
            <span>
              <strong>{name}</strong>
              <small>
                {data.products.filter((p) => p.platform === name).length}{" "}
                produtos no catálogo
              </small>
            </span>
            <span>↗</span>
          </button>
        ))}
      </div>
      <div className="metric-grid">
        {[
          [
            "products",
            data.products.length,
            "Produtos no catálogo",
            "Variedade para criar",
          ],
          [
            "creators",
            data.creators.length,
            "Criadoras fictícias",
            "Perfis adultos gerados por IA",
          ],
          [
            "videos",
            data.videos.length,
            "Campanhas no fluxo",
            "Uma por etapa de produção",
          ],
          [
            "feedbacks",
            data.videos.filter((v) => v.status === "Publicado").length,
            "Publicação simulada",
            "Ainda sem dados reais",
          ],
        ].map(([target, value, label, detail]) => (
          <button
            className="metric"
            key={label}
            onClick={() => go(target as Page)}
          >
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{detail}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <Panel>
          <div className="section-head">
            <div>
              <h2>Projetos em movimento</h2>
              <p>Campanhas conectadas ao catálogo.</p>
            </div>
            <button className="link-button" onClick={() => go("videos")}>
              Ver todos →
            </button>
          </div>
          <div className="table">
            {data.videos.map((video) => (
              <button
                className="table-row"
                key={video.id}
                onClick={() => go("videos")}
              >
                <span>
                  <strong>{video.title}</strong>
                  <small>{video.product}</small>
                </span>
                <span>{video.creator}</span>
                <Tag tone={video.status}>{video.status}</Tag>
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="section-head">
            <div>
              <h2>Próximos passos</h2>
              <p>Checklist da coleção de exemplo.</p>
            </div>
          </div>
          {data.videos.slice(0, 4).map((video) => (
            <label className="check-row" key={video.id}>
              <input
                type="checkbox"
                checked={data.completedSteps.includes(video.id)}
                onChange={() => toggleStep(video.id)}
              />
              <span>
                <strong>{video.product.split(" · ")[0]}</strong>
                <small>{video.note}</small>
              </span>
            </label>
          ))}
        </Panel>
      </div>
      <Panel>
        <div className="section-head">
          <div>
            <h2>Um fluxo, seis etapas</h2>
            <p>O status de cada campanha é o mesmo em todas as áreas.</p>
          </div>
          <button className="link-button" onClick={() => go("videos")}>
            Abrir Video Lab →
          </button>
        </div>
        <div className="flow">
          {statusOrder.map((status) => (
            <button key={status} onClick={() => go("videos")}>
              <span></span>
              <strong>{status}</strong>
              <small>
                {data.videos.filter((v) => v.status === status).length} campanha
              </small>
            </button>
          ))}
        </div>
      </Panel>
    </>
  )
}

const productFields: Field[] = [
  { key: "name", label: "Nome do produto", required: true },
  { key: "price", label: "Preço (R$)", type: "number", required: true },
  { key: "category", label: "Categoria", required: true },
  {
    key: "platform",
    label: "Plataforma",
    type: "select",
    options: ["Shopee", "TikTok Shop", "Kwai", "SHEIN"],
  },
  { key: "benefits", label: "Benefícios", type: "textarea", required: true },
  { key: "audience", label: "Público-alvo", type: "textarea" },
  { key: "link", label: "Link de venda", type: "url" },
  { key: "status", label: "Status", type: "select", options: statusOrder },
]

function Products({
  items,
  search,
  add,
  edit,
  remove,
}: {
  items: Product[]
  search: string
  add: () => void
  edit: (item: Product) => void
  remove: (id: string) => void
}) {
  const [platform, setPlatform] = useState("Todos")
  const list = items.filter(
    (item) =>
      (!search ||
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())) &&
      (platform === "Todos" || item.platform === platform),
  )
  return (
    <>
      <PageTitle
        area="02"
        title="Produtos com potencial de história."
        subtitle="Um catálogo organizado para transformar benefícios em cenas de UGC."
        action={<Button onClick={add}>＋&nbsp; Adicionar produto</Button>}
      />
      <Notice>
        Todos os produtos são fictícios. Substitua por informações verificadas
        antes de publicar.
      </Notice>
      <div className="filter-row">
        {["Todos", "Shopee", "TikTok Shop", "Kwai", "SHEIN"].map((item) => (
          <button
            className={platform === item ? "filter-active" : ""}
            onClick={() => setPlatform(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="section-head">
        <div>
          <h2>Catálogo de produtos</h2>
          <p>{list.length} produtos encontrados</p>
        </div>
      </div>
      {list.length ? (
        <div className="product-grid">
          {list.map((product) => (
            <article className="product-card" key={product.id}>
              <img src={product.image} alt={product.name} />
              <div className="card-top">
                <Tag>{product.category}</Tag>
                <Tag tone={product.status}>{product.status}</Tag>
              </div>
              <h2>{product.name}</h2>
              <div className="price">R$ {formatPrice(product.price)}</div>
              <dl>
                <dt>BENEFÍCIOS A DEMONSTRAR</dt>
                <dd>{product.benefits}</dd>
                <dt>PÚBLICO-ALVO</dt>
                <dd>{product.audience}</dd>
                <dt>PLATAFORMA</dt>
                <dd>{product.platform}</dd>
              </dl>
              {product.link ? (
                <a
                  className="product-link"
                  href={product.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {product.link}
                </a>
              ) : (
                <span className="product-link">Sem link cadastrado</span>
              )}
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(product)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(product.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhum produto encontrado"
          text="Altere a busca ou cadastre um novo produto."
        />
      )}
    </>
  )
}

const creatorFields: Field[] = [
  { key: "name", label: "Nome", required: true },
  { key: "age", label: "Idade", required: true },
  { key: "style", label: "Estilo", required: true },
  {
    key: "description",
    label: "Descrição e personalidade",
    type: "textarea",
    required: true,
  },
  { key: "prompt", label: "Prompt-base", type: "textarea", required: true },
]

function Creators({
  items,
  search,
  copyPrompt,
  add,
  edit,
  remove,
}: {
  items: Creator[]
  search: string
  copyPrompt: (prompt: string) => void
  add: () => void
  edit: (item: Creator) => void
  remove: (id: string) => void
}) {
  const list = items.filter(
    (item) =>
      !search ||
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="03"
        title="Uma identidade para cada história."
        subtitle="Galeria de criadoras fictícias adultas, com direção visual e voz consistentes."
        action={<Button onClick={add}>＋&nbsp; Novo perfil</Button>}
      />
      <Notice>
        Todos os perfis são fictícios e os retratos são ilustrativos. Não use
        identidade de pessoas reais sem autorização.
      </Notice>
      <div className="section-head">
        <div>
          <h2>Banco de criadoras IA</h2>
          <p>{list.length} perfis completos</p>
        </div>
      </div>
      {list.length ? (
        <div className="creator-grid">
          {list.map((creator) => (
            <article className="creator-card" key={creator.id}>
              <img src={creator.image} alt={creator.name} />
              <div className="card-top">
                <div>
                  <h2>{creator.name}</h2>
                  <p>{creator.age} anos • Mulher adulta • Perfil fictício</p>
                </div>
                <Tag tone="purple">{creator.style}</Tag>
              </div>
              <h3>PERSONALIDADE</h3>
              <p>{creator.description}</p>
              <div className="prompt">
                <strong>PROMPT-BASE • COPIE PARA CADA CENA</strong>
                {creator.prompt}
              </div>
              <div className="card-actions">
                <Button
                  variant="secondary"
                  onClick={() => copyPrompt(creator.prompt)}
                >
                  Copiar prompt
                </Button>
                <Button variant="secondary" onClick={() => edit(creator)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(creator.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhuma criadora encontrada"
          text="Altere a busca ou cadastre um novo perfil."
        />
      )}
    </>
  )
}

const copyFields: Field[] = [
  { key: "title", label: "Título / Hook", required: true },
  {
    key: "type",
    label: "Tipo",
    type: "select",
    options: ["Hook", "Roteiro", "CTA", "Legenda"],
  },
  { key: "product", label: "Produto", required: true },
  { key: "platform", label: "Plataforma", required: true },
  { key: "content", label: "Conteúdo", type: "textarea", required: true },
]

function Copies({
  items,
  search,
  copyContent,
  add,
  edit,
  remove,
}: {
  items: Copy[]
  search: string
  copyContent: (content: string) => void
  add: () => void
  edit: (item: Copy) => void
  remove: (id: string) => void
}) {
  const [type, setType] = useState("Todos")
  const list = items.filter(
    (item) =>
      (!search ||
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())) &&
      (type === "Todos" || item.type === type),
  )
  return (
    <>
      <PageTitle
        area="04"
        title="Palavras que viram boas cenas."
        subtitle="Hooks, roteiros e CTAs organizados para adaptar sem começar do zero."
        action={<Button onClick={add}>＋&nbsp; Nova copy</Button>}
      />
      <Notice>
        Copies demonstrativas. Confira benefícios, disponibilidade e regras da
        plataforma antes da veiculação.
      </Notice>
      <div className="filter-row">
        {["Todos", "Hook", "Roteiro", "CTA", "Legenda"].map((item) => (
          <button
            className={type === item ? "filter-active" : ""}
            onClick={() => setType(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="copy-grid">
        {list.map((copy) => (
          <article className="copy-card" key={copy.id}>
            <div className="card-top">
              <Tag tone="purple">{copy.product}</Tag>
              <small>{copy.platform}</small>
            </div>
            <h2>“{copy.title}”</h2>
            <Tag>{copy.type}</Tag>
            <p>{copy.content}</p>
            <div className="card-actions">
              <Button
                variant="secondary"
                onClick={() => copyContent(copy.content)}
              >
                Copiar
              </Button>
              <Button variant="secondary" onClick={() => edit(copy)}>
                Editar
              </Button>
              <Button variant="danger" onClick={() => remove(copy.id)}>
                Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

const videoFields: Field[] = [
  { key: "title", label: "Nome da campanha", required: true },
  { key: "product", label: "Produto", required: true },
  { key: "creator", label: "Criadora", required: true },
  { key: "status", label: "Etapa", type: "select", options: statusOrder },
  { key: "note", label: "Próxima ação", type: "textarea", required: true },
]

function Videos({
  items,
  search,
  add,
  edit,
  move,
  remove,
}: {
  items: Video[]
  search: string
  add: () => void
  edit: (item: Video) => void
  move: (id: string, status: Status) => void
  remove: (id: string) => void
}) {
  const list = items.filter(
    (video) =>
      !search ||
      JSON.stringify(video).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="05"
        title="Da ideia ao último take."
        subtitle="Acompanhe o fluxo e transforme o roteiro em um storyboard visual completo."
        action={<Button onClick={add}>＋&nbsp; Novo vídeo</Button>}
      />
      <div className="section-head">
        <div>
          <h2>Quadro de produção</h2>
          <p>
            Uma campanha por etapa. Atualize o status ao editar ou mova pelos
            controles.
          </p>
        </div>
        <Tag tone="purple">Kanban interativo</Tag>
      </div>
      <div className="kanban">
        {statusOrder.map((status) => (
          <section
            className={`kanban-column ${
              status === "Revisão" ? "highlight" : ""
            }`}
            key={status}
          >
            <header>
              <strong>{status}</strong>
              <Tag>{list.filter((v) => v.status === status).length}</Tag>
            </header>
            {list
              .filter((video) => video.status === status)
              .map((video) => {
                const index = statusOrder.indexOf(status)
                return (
                  <article className="kanban-card" key={video.id}>
                    <img src={video.image} alt="" />
                    <Tag tone="purple">{video.product.split(" · ")[0]}</Tag>
                    <h3>{video.title}</h3>
                    <p>{video.product}</p>
                    <small>{video.creator}</small>
                    <hr />
                    <strong>Próxima ação</strong>
                    <p>{video.note}</p>
                    <div className="kanban-actions">
                      <button
                        disabled={index === 0}
                        onClick={() => move(video.id, statusOrder[index - 1])}
                        aria-label="Mover para etapa anterior"
                      >
                        ←
                      </button>
                      <button onClick={() => edit(video)}>Editar</button>
                      <button
                        disabled={index === statusOrder.length - 1}
                        onClick={() => move(video.id, statusOrder[index + 1])}
                        aria-label="Mover para próxima etapa"
                      >
                        →
                      </button>
                    </div>
                    <button
                      className="remove-link"
                      onClick={() => remove(video.id)}
                    >
                      Excluir
                    </button>
                  </article>
                )
              })}
          </section>
        ))}
      </div>
    </>
  )
}

const referenceFields: Field[] = [
  { key: "title", label: "Título", required: true },
  { key: "link", label: "Link", type: "url", required: true },
  {
    key: "note",
    label: "Observação estratégica",
    type: "textarea",
    required: true,
  },
]

function References({
  items,
  search,
  add,
  edit,
  remove,
}: {
  items: Reference[]
  search: string
  add: () => void
  edit: (item: Reference) => void
  remove: (id: string) => void
}) {
  const list = items.filter(
    (item) =>
      !search ||
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="06"
        title="Repertório que dá direção."
        subtitle="Reúna prints, referências e estratégias para criar com intenção — sem copiar."
        action={<Button onClick={add}>＋&nbsp; Salvar referência</Button>}
      />
      <Notice>
        Use apenas materiais que você tem autorização para consultar e publicar.
      </Notice>
      {list.length ? (
        <div className="reference-grid">
          {list.map((ref) => (
            <article className="reference-card" key={ref.id}>
              <img src={ref.image} alt="" />
              <Tag tone="purple">REFERÊNCIA</Tag>
              <h2>{ref.title}</h2>
              <h3>O QUE OBSERVAR</h3>
              <p>{ref.note}</p>
              <a href={ref.link} target="_blank" rel="noreferrer">
                {ref.link}
              </a>
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(ref)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(ref.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhuma referência encontrada"
          text="Altere a busca ou salve uma nova referência."
        />
      )}
      <Panel>
        <div className="section-head">
          <div>
            <h2>Links organizados por intenção</h2>
            <p>Seu repertório salvo e disponível para consulta.</p>
          </div>
        </div>
        {list.map((ref) => (
          <div className="simple-row" key={ref.id}>
            <strong>{ref.title}</strong>
            <a href={ref.link} target="_blank" rel="noreferrer">
              {ref.link}
            </a>
          </div>
        ))}
      </Panel>
    </>
  )
}

const feedbackFields: Field[] = [
  { key: "campaign", label: "Campanha", required: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Pendente", "Concluído"],
  },
  {
    key: "comment",
    label: "Feedback criativo",
    type: "textarea",
    required: true,
  },
  {
    key: "adjustment",
    label: "Ajuste solicitado",
    type: "textarea",
    required: true,
  },
]

function Feedbacks({
  items,
  search,
  add,
  edit,
  remove,
  toggle,
}: {
  items: Feedback[]
  search: string
  add: () => void
  edit: (item: Feedback) => void
  remove: (id: string) => void
  toggle: (id: string) => void
}) {
  const list = items.filter(
    (item) =>
      !search ||
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="07"
        title="Aprenda com o que realmente acontece."
        subtitle="Separe feedback criativo de resultados de venda. Registre evidências, não suposições."
        action={<Button onClick={add}>＋&nbsp; Registrar feedback</Button>}
      />
      <Notice>
        Aguardando dados reais. Não há veiculação ou vendas nesta coleção
        demonstrativa.
      </Notice>
      <div className="metric-grid">
        {[
          "Visualizações",
          "Cliques no produto",
          "Vendas atribuídas",
          "Taxa de cliques",
        ].map((label) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>—</strong>
            <small>Aguardando dados reais</small>
          </div>
        ))}
      </div>
      <Panel>
        <div className="section-head">
          <div>
            <h2>Feedback criativo</h2>
            <p>Comentários internos organizados por campanha.</p>
          </div>
        </div>
        {list.length ? (
          list.map((item) => (
            <article className="feedback-row" key={item.id}>
              <button
                className={`feedback-check ${
                  item.status === "Concluído" ? "done" : ""
                }`}
                onClick={() => toggle(item.id)}
                aria-label={`Marcar ${item.campaign} como ${
                  item.status === "Pendente" ? "concluído" : "pendente"
                }`}
                aria-pressed={item.status === "Concluído"}
              />
              <div>
                <div className="card-top">
                  <strong>{item.campaign}</strong>
                  <Tag
                    tone={item.status === "Concluído" ? "Aprovado" : "Revisão"}
                  >
                    {item.status}
                  </Tag>
                </div>
                <p>“{item.comment}”</p>
                <small>AJUSTE SOLICITADO</small>
                <p>{item.adjustment}</p>
              </div>
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(item)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(item.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Nenhum feedback encontrado"
            text="Altere a busca ou registre um feedback para uma campanha."
          />
        )}
      </Panel>
    </>
  )
}

function Template({
  data,
  duplicate,
}: {
  data: AppData
  duplicate: () => void
}) {
  const product = data.products[0],
    creator = data.creators[0],
    copy = data.copies[0]
  return (
    <>
      <PageTitle
        area="08"
        title="Uma campanha. Tudo conectado."
        subtitle="Modelo duplicável por produto, preenchido com a campanha demonstrativa do Névoa."
        action={<Button onClick={duplicate}>Duplicar campanha</Button>}
      />
      <div className="template-steps">
        <span>
          <strong>01 / DUPLIQUE O FRAME</strong>Mantenha este modelo e renomeie
          a cópia.
        </span>
        <span>
          <strong>02 / PREENCHA O BRIEF</strong>Troque produto, criadora,
          referências e copies.
        </span>
        <span>
          <strong>03 / ACOMPANHE</strong>Atualize o Video Lab e registre
          resultados.
        </span>
      </div>
      <section className="campaign-hero">
        <div>
          <Tag tone="purple">CAMPANHA DEMONSTRATIVA</Tag>
          <h2>Um cantinho mais acolhedor</h2>
          <p>
            Um detalhe de bem-estar visual para a rotina de trabalho em casa.
          </p>
        </div>
        <img src={product?.image} alt="" />
      </section>
      <Panel>
        <h2>Briefing do produto</h2>
        <div className="brief-grid">
          <span>
            <strong>PRODUTO / CATEGORIA</strong>
            {product?.name}
            <br />
            {product?.category}
          </span>
          <span>
            <strong>PREÇO / PLATAFORMA</strong>R$ {product?.price}
            <br />
            {product?.platform}
          </span>
          <span>
            <strong>BENEFÍCIOS</strong>
            {product?.benefits}
          </span>
        </div>
      </Panel>
      <div className="dashboard-columns">
        <Panel>
          <h2>Criadora escolhida</h2>
          <div className="creator-mini">
            <img src={creator?.image} alt="" />
            <span>
              <strong>
                {creator?.name} • {creator?.age} anos
              </strong>
              {creator?.description}
            </span>
          </div>
        </Panel>
        <Panel>
          <h2>Copy selecionada</h2>
          <blockquote>“{copy?.title}”</blockquote>
          <p>{copy?.content}</p>
        </Panel>
      </div>
      <Panel>
        <h2>Roteiro • versão A</h2>
        {[
          "0–3 s / Hook",
          "3–9 s / Demonstração",
          "9–17 s / Contexto",
          "17–24 s / CTA",
        ].map((step, index) => (
          <div className="simple-row" key={step}>
            <Tag tone="purple">{step}</Tag>
            <span>
              {index === 0
                ? copy?.title
                : [
                    "Mostrar a névoa suave e a luz ambiente.",
                    "Apresentar o formato compacto ao lado dos livros.",
                    "Confira os detalhes no link do produto.",
                  ][index - 1]}
            </span>
          </div>
        ))}
      </Panel>
    </>
  )
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [page, setPage] = useState<Page>("dashboard")
  const [search, setSearch] = useState("")
  const [menu, setMenu] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [actionMessage, setActionMessage] = useState("")
  const toastTimer = useRef<number | null>(null)
  const [modal, setModal] = useState<{
    collection: Collection
    item?: Record<string, unknown>
  } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setStorageError(false)
    } catch (error) {
      console.error(
        "Não foi possível salvar os dados do UGC AI Creator Hub.",
        error,
      )
      setStorageError(true)
    }
  }, [data])
  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    [],
  )
  useEffect(() => {
    setSearch("")
    window.scrollTo({ top: 0 })
  }, [page])

  const modalConfig = useMemo(() => {
    if (!modal) return null
    const configs: Record<Collection, {
      title: string
      fields: Field[]
      defaults: Record<string, string>
    }> = {
      products: {
        title: modal.item ? "Editar produto" : "Adicionar produto",
        fields: productFields,
        defaults: { platform: "Shopee", status: "Ideias" },
      },
      creators: {
        title: modal.item ? "Editar criadora" : "Novo perfil de criadora",
        fields: creatorFields,
        defaults: {},
      },
      copies: {
        title: modal.item ? "Editar copy" : "Nova copy",
        fields: copyFields,
        defaults: { type: "Hook" },
      },
      videos: {
        title: modal.item ? "Editar vídeo" : "Novo vídeo",
        fields: videoFields,
        defaults: { status: "Ideias" },
      },
      references: {
        title: modal.item ? "Editar referência" : "Salvar referência",
        fields: referenceFields,
        defaults: {},
      },
      feedbacks: {
        title: modal.item ? "Editar feedback" : "Registrar feedback",
        fields: feedbackFields,
        defaults: { status: "Pendente" },
      },
    }
    return configs[modal.collection]
  }, [modal])

  const saveModal = (values: Record<string, string>) => {
    if (!modal) return
    const collection = modal.collection
    const old = modal.item
    const imageDefaults: Partial<Record<Collection, string>> = {
      products: "/images/home.jpg",
      creators: "/images/creator-1.jpg",
      videos: "/images/home.jpg",
      references: "/images/home.jpg",
    }
    const item = {
      ...old,
      ...values,
      id: old?.id as string || uid(),
      ...(imageDefaults[collection] && !old?.image
        ? { image: imageDefaults[collection] }
        : {}),
    }
    setData(
      (current) =>
        ({
          ...current,
          [collection]: old
            ? current[collection].map((entry) =>
                entry.id === old.id ? item : entry,
              )
            : [...current[collection], item],
        }) as AppData,
    )
    setModal(null)
  }

  const copyText = async (text: string, label: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API indisponível neste contexto.")
      }
      await navigator.clipboard.writeText(text)
      setActionMessage(`${label} copiado para a área de transferência.`)
    } catch (error) {
      console.error(`Não foi possível copiar ${label.toLowerCase()}.`, error)
      setActionMessage(
        `Não foi possível copiar ${label.toLowerCase()}. Verifique as permissões do navegador.`,
      )
    }
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setActionMessage(""), 4000)
  }

  const remove = (collection: Collection, id: string) => {
    if (
      window.confirm(
        "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
      )
    ) {
      setData(
        (current) =>
          ({
            ...current,
            [collection]: current[collection].filter((item) => item.id !== id),
            ...(collection === "videos"
              ? {
                  completedSteps: current.completedSteps.filter(
                    (stepId) => stepId !== id,
                  ),
                }
              : {}),
          }) as AppData,
      )
    }
  }
  const open = (collection: Collection, item?: object) =>
    setModal({ collection, item: item as Record<string, unknown> | undefined })
  const moveVideo = (id: string, status: Status) =>
    setData((current) => ({
      ...current,
      videos: current.videos.map((video) =>
        video.id === id ? { ...video, status } : video,
      ),
    }))
  const toggleFeedback = (id: string) =>
    setData((current) => ({
      ...current,
      feedbacks: current.feedbacks.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "Pendente" ? "Concluído" : "Pendente",
            }
          : item,
      ),
    }))
  const toggleStep = (id: string) =>
    setData((current) => ({
      ...current,
      completedSteps: current.completedSteps.includes(id)
        ? current.completedSteps.filter((stepId) => stepId !== id)
        : [...current.completedSteps, id],
    }))
  const duplicateCampaign = () => {
    const source = data.videos[0]
    if (!source) {
      setActionMessage(
        "Não há campanhas para duplicar. Crie um vídeo no Video Lab primeiro.",
      )
      setPage("videos")
      return
    }
    setData((current) => ({
      ...current,
      videos: [
        ...current.videos,
        {
          ...source,
          id: uid(),
          title: `${source.title} · cópia`,
          status: "Ideias",
        },
      ],
    }))
    setPage("videos")
  }

  let content: ReactNode
  if (page === "dashboard")
    content = (
      <Dashboard
        data={data}
        go={setPage}
        createCampaign={() => open("videos")}
        toggleStep={toggleStep}
      />
    )
  else if (page === "products")
    content = (
      <Products
        items={data.products}
        search={search}
        add={() => open("products")}
        edit={(item) => open("products", item)}
        remove={(id) => remove("products", id)}
      />
    )
  else if (page === "creators")
    content = (
      <Creators
        items={data.creators}
        search={search}
        copyPrompt={(prompt) => void copyText(prompt, "Prompt")}
        add={() => open("creators")}
        edit={(item) => open("creators", item)}
        remove={(id) => remove("creators", id)}
      />
    )
  else if (page === "copies")
    content = (
      <Copies
        items={data.copies}
        search={search}
        copyContent={(text) => void copyText(text, "Copy")}
        add={() => open("copies")}
        edit={(item) => open("copies", item)}
        remove={(id) => remove("copies", id)}
      />
    )
  else if (page === "videos")
    content = (
      <Videos
        items={data.videos}
        search={search}
        add={() => open("videos")}
        edit={(item) => open("videos", item)}
        move={moveVideo}
        remove={(id) => remove("videos", id)}
      />
    )
  else if (page === "references")
    content = (
      <References
        items={data.references}
        search={search}
        add={() => open("references")}
        edit={(item) => open("references", item)}
        remove={(id) => remove("references", id)}
      />
    )
  else if (page === "feedbacks")
    content = (
      <Feedbacks
        items={data.feedbacks}
        search={search}
        add={() => open("feedbacks")}
        edit={(item) => open("feedbacks", item)}
        remove={(id) => remove("feedbacks", id)}
        toggle={toggleFeedback}
      />
    )
  else content = <Template data={data} duplicate={duplicateCampaign} />

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        open={menu}
        close={() => setMenu(false)}
      />
      {menu && (
        <button
          className="mobile-overlay"
          onClick={() => setMenu(false)}
          aria-label="Fechar menu"
        />
      )}
      <div className="workspace">
        <Header
          page={page}
          search={search}
          setSearch={setSearch}
          onMenu={() => setMenu(true)}
        />
        <main>
          {storageError && (
            <div className="storage-warning" role="alert">
              Não foi possível salvar as alterações neste navegador. Verifique o
              espaço disponível e as permissões de armazenamento.
            </div>
          )}
          {content}
          <footer>
            UGC AI CREATOR HUB&nbsp;&nbsp;•&nbsp;&nbsp;Organize. Crie. Aprenda.
            <span>Conteúdo demonstrativo e editável</span>
          </footer>
        </main>
      </div>
      {actionMessage && (
        <div className="toast" role="status">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage("")}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}
      {modal && modalConfig && (
        <FormModal
          title={modalConfig.title}
          fields={modalConfig.fields}
          initial={{
            ...modalConfig.defaults,
            ...Object.fromEntries(
              Object.entries(modal.item || {}).map(([key, value]) => [
                key,
                String(value),
              ]),
            ),
          }}
          onSave={saveModal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
