import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { AuthProvider, useAuth } from "../auth/AuthProvider"
import { Header, Sidebar } from "../components/layout"
import { Button, FormModal, type Field } from "../components/ui"
import {
  useSignedWorkspaceImages,
  useWorkspaceData,
} from "../data/useWorkspaceData"
import { previewWorkspace } from "../data/previewWorkspace"
import type { AppData, Status } from "../types/domain"
import { uid } from "../utils/id"
import { AuthScreen } from "../features/auth/AuthScreen"
import { Dashboard } from "../features/pages/Dashboard"
import { Products, Creators } from "../features/pages/CatalogPages"
import { Copies } from "../features/pages/CopyLibrary"
import { Videos } from "../features/pages/VideoLab"
import { References } from "../features/pages/References"
import { Feedbacks } from "../features/pages/Feedbacks"
import { Drafts } from "../features/pages/Drafts"
import { Template } from "../features/pages/CampaignTemplate"
import {
  copyFields,
  creatorFields,
  draftFields,
  feedbackFields,
  productFields,
  referenceFields,
  videoFields,
} from "../features/forms/fields"
import { type Collection, type Page } from "./navigation"
import { WORKSPACE_IMAGE_BUCKET } from "../lib/supabase"

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="auth-page">
      <div className="auth-card cloud-loading" role="status" aria-live="polite">
        <span className="eyebrow">UGC AI CREATOR HUB</span>
        <p>{message}</p>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}

function AppGate() {
  const auth = useAuth()
  const [previewMode, setPreviewMode] = useState(false)

  if (auth.loading) return <LoadingScreen message="Verificando sua sessão..." />
  if (auth.configurationError) {
    if (previewMode) {
      return (
        <Workspace
          key="visual-preview"
          client={null}
          userId=""
          email="Pré-visualização"
          previewData={previewWorkspace}
          onExitPreview={() => setPreviewMode(false)}
        />
      )
    }
    return (
      <AuthScreen
        client={null}
        configurationError={auth.configurationError}
        recovery={false}
        sessionError=""
        onPreview={() => setPreviewMode(true)}
      />
    )
  }
  if (auth.passwordRecovery) {
    return (
      <AuthScreen
        key="password-recovery"
        client={auth.client}
        configurationError={null}
        recovery
        sessionError=""
      />
    )
  }
  if (!auth.user) {
    return (
      <AuthScreen
        key="account"
        client={auth.client}
        configurationError={null}
        recovery={false}
        sessionError={auth.error}
      />
    )
  }
  if (!auth.client) {
    return <LoadingScreen message="A conexão segura não está disponível." />
  }

  return (
    <Workspace
      key={auth.user.id}
      client={auth.client}
      userId={auth.user.id}
      email={auth.user.email ?? ""}
    />
  )
}

function Workspace({
  client,
  userId,
  email,
  previewData,
  onExitPreview,
}: {
  client: SupabaseClient | null
  userId: string
  email: string
  previewData?: AppData
  onExitPreview?: () => void
}) {
  const {
    data,
    setData,
    loading,
    saving,
    error: saveError,
    loadError,
    lastSavedAt,
    retryLoad,
    retrySave,
    flushSave,
  } = useWorkspaceData(client, userId, previewData)
  const { resolveImage, imageError } = useSignedWorkspaceImages(
    client,
    userId,
    data,
  )
  const [page, setPage] = useState<Page>("dashboard")
  const [search, setSearch] = useState("")
  const [menu, setMenu] = useState(false)
  const [actionMessage, setActionMessage] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const toastTimer = useRef<number | null>(null)
  const [modal, setModal] = useState<{
    collection: Collection
    item?: Record<string, unknown>
  } | null>(null)

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
      drafts: {
        title: modal.item ? "Editar rascunho" : "Novo rascunho",
        fields: draftFields,
        defaults: {},
      },
    }
    return configs[modal.collection]
  }, [modal])

  const saveModal = async (
    values: Record<string, string>,
    files: Record<string, File>,
  ) => {
    if (!modal) return
    const collection = modal.collection
    const old = modal.item
    const image = files.image
    if (image && client) {
      const safeName =
        image.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "image"
      const imagePath = `${userId}/${collection}/${uid()}-${safeName}`
      const { error: uploadError } = await client.storage
        .from(WORKSPACE_IMAGE_BUCKET)
        .upload(imagePath, image, {
          cacheControl: "3600",
          contentType: image.type,
          upsert: false,
        })
      if (uploadError) {
        console.error("Não foi possível enviar a imagem da conta.", uploadError)
        throw new Error(
          `Não foi possível enviar a imagem: ${uploadError.message}`,
        )
      }
      values.image = imagePath
    } else if (image) {
      values.image = URL.createObjectURL(image)
    } else if (typeof old?.image === "string") {
      values.image = old.image
    } else if (
      ["products", "creators", "videos", "references"].includes(collection)
    ) {
      values.image = ""
    }

    const oldId = typeof old?.id === "string" ? old.id : undefined
    const item = {
      ...old,
      ...values,
      id: oldId ?? uid(),
      ...(collection === "drafts"
        ? { updatedAt: new Date().toISOString() }
        : {}),
    }
    setData(
      (current) =>
        ({
          ...current,
          [collection]: oldId
            ? current[collection].map((entry) =>
                entry.id === oldId ? item : entry,
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
      !window.confirm(
        "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
      )
    ) {
      return
    }

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
  const logout = async () => {
    if (!client) {
      onExitPreview?.()
      return
    }
    setLoggingOut(true)
    setLogoutError("")
    try {
      if (!loadError) await flushSave()
      const { error: logoutError } = await client.auth.signOut({
        scope: "local",
      })
      if (logoutError) throw logoutError
    } catch (logoutError) {
      console.error(
        "Não foi possível encerrar a sessão com segurança.",
        logoutError,
      )
      const message =
        logoutError instanceof Error
          ? `Não foi possível sair com segurança: ${logoutError.message}`
          : "Não foi possível sair com segurança. Tente novamente."
      setLogoutError(message)
      setActionMessage(message)
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading)
    return <LoadingScreen message="Carregando seus dados da nuvem..." />
  if (loadError) {
    return (
      <main className="auth-page">
        <section className="auth-card" role="alert">
          <span className="eyebrow">UGC AI CREATOR HUB</span>
          <h1>Não foi possível carregar seu espaço</h1>
          <p>{loadError}</p>
          {logoutError && (
            <p className="auth-error" role="alert">
              {logoutError}
            </p>
          )}
          <div className="auth-actions">
            <button className="button button-primary" onClick={retryLoad}>
              Tentar novamente
            </button>
            <button
              className="button button-secondary"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? "Saindo..." : "Sair da conta"}
            </button>
          </div>
        </section>
      </main>
    )
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
        resolveImage={resolveImage}
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
        resolveImage={resolveImage}
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
        resolveImage={resolveImage}
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
        resolveImage={resolveImage}
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
  else if (page === "drafts")
    content = (
      <Drafts
        items={data.drafts}
        search={search}
        add={() => open("drafts")}
        edit={(item) => open("drafts", item)}
        remove={(id) => remove("drafts", id)}
      />
    )
  else
    content = (
      <Template
        data={data}
        duplicate={duplicateCampaign}
        resolveImage={resolveImage}
      />
    )

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        open={menu}
        close={() => setMenu(false)}
        preview={Boolean(previewData)}
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
          email={email}
          saving={saving}
          lastSavedAt={lastSavedAt}
          error={saveError}
          onLogout={() => void logout()}
          onRetrySave={retrySave}
          loggingOut={loggingOut}
          preview={Boolean(previewData)}
        />
        <main>
          {previewData && (
            <div className="preview-notice" role="status">
              <strong>Preview visual · dados demonstrativos</strong>
              <span>
                Alterações aparecem apenas nesta sessão e não são salvas na
                nuvem.
              </span>
            </div>
          )}
          {saveError && (
            <div className="storage-warning" role="alert">
              <strong>Alterações ainda não confirmadas na nuvem.</strong>{" "}
              {saveError}
            </div>
          )}
          {imageError && (
            <div className="storage-warning" role="alert">
              {imageError}
            </div>
          )}
          {content}
          <footer>
            UGC AI CREATOR HUB&nbsp;&nbsp;•&nbsp;&nbsp;Organize. Crie. Aprenda.
            <span>
              {previewData
                ? "Demonstração visual · sem persistência"
                : "Dados privados vinculados à sua conta"}
            </span>
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
      {loggingOut && (
        <div className="toast" role="status">
          Encerrando sua sessão...
        </div>
      )}
    </div>
  )
}
