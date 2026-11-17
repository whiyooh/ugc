import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { AuthProvider, useAuth } from "../auth/AuthProvider"
import { Header, PageTitle, Sidebar } from "../components/layout"
import { LoadingScreen } from "../components/LoadingScreen"
import { Button, FormModal, type Field } from "../components/ui"
import {
  useSignedWorkspaceImages,
  useWorkspaceData,
} from "../data/useWorkspaceData"
import {
  importFeedbacks,
  uploadWorkspaceImage,
} from "../data/workspaceRepository"
import { previewWorkspace } from "../data/previewWorkspace"
import type { AppData, Status } from "../types/domain"
import { uid } from "../utils/id"
import { parseFeedbackCsv } from "../utils/feedbackImport"
import { publicAsset } from "../utils/assets"
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
import {
  isLockedScreen,
  pageNames,
  pagePaths,
  type Collection,
  type Page,
} from "./navigation"
import { PlanAccessGate, PlanProvider, usePlan } from "../plans/PlanProvider"
import { PlansPage } from "../plans/PlansPage"
import {
  copyFeatureForType,
  planIds,
  type PlanId,
  type PlanResource,
} from "../plans/config"
import {
  minimumPlanForResource,
  PlanUpgradeRequiredError,
} from "../plans/authorization"
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "../plans/billingClient"

const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "")
const homePath = `${basePath}/`
const plansPath = `${basePath}/planos`

function pathForPage(page: Page): string {
  return `${basePath}${pagePaths[page]}`
}

function pageForPathname(pathname: string): Page {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/"
  return (
    (Object.keys(pagePaths) as Page[]).find(
      (page) => pathForPage(page).replace(/\/+$/, "") === normalizedPath,
    ) ?? "dashboard"
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
  const [pathname, setPathname] = useState(window.location.pathname)
  const [previewPlan] = useState<PlanId | null>(() => {
    const requestedPlan = new URLSearchParams(window.location.search).get(
      "previewPlan",
    )
    if (requestedPlan === "none") return null
    return planIds.find((planId) => planId === requestedPlan) ?? "pro"
  })

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", updatePathname)
    return () => window.removeEventListener("popstate", updatePathname)
  }, [])

  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path)
      setPathname(window.location.pathname)
    }
  }, [])
  const openPlans = useCallback(() => navigate(plansPath), [navigate])
  const billingClient = auth.client
  const billingUser = auth.user
  const startPlanCheckout =
    billingClient && billingUser
      ? async (planId: PlanId) => {
          const url = await createCheckoutSession(billingClient, planId)
          window.location.assign(url)
        }
      : undefined
  const openBillingPortal =
    billingClient && billingUser
      ? async () => {
          const url = await createBillingPortalSession(billingClient)
          window.location.assign(url)
        }
      : undefined
  const checkSubscriptionStatus =
    billingClient && billingUser
      ? async () => {
          const { data, error } = await billingClient
            .from("user_subscriptions")
            .select("plan, status, expires_at")
            .eq("user_id", billingUser.id)
            .maybeSingle()
          if (error) throw error
          if (!data) return "Ainda não há uma assinatura nesta conta."
          return `Status da assinatura: ${data.status} · plano ${data.plan}.`
        }
      : undefined

  if (pathname.replace(/\/+$/, "") === plansPath.replace(/\/+$/, "")) {
    return (
      <PlansPage
        onBack={() => navigate(homePath)}
        onSubscribe={startPlanCheckout}
        onManageSubscription={openBillingPortal}
        onCheckStatus={checkSubscriptionStatus}
      />
    )
  }
  if (auth.loading) return <LoadingScreen message="Verificando sua sessão..." />
  if (previewMode) {
    return (
      <PlanProvider
        client={null}
        userId=""
        previewPlan={previewPlan ?? undefined}
      >
        <PlanAccessGate>
          <Workspace
            key="visual-preview"
            client={null}
            userId=""
            email="Pré-visualização"
            previewData={previewWorkspace}
            onExitPreview={() => setPreviewMode(false)}
            onOpenPlans={openPlans}
          />
        </PlanAccessGate>
      </PlanProvider>
    )
  }
  if (auth.configurationError) {
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
        callbackError={auth.callbackError}
        onPreview={() => setPreviewMode(true)}
      />
    )
  }
  if (!auth.client) {
    return <LoadingScreen message="A conexão segura não está disponível." />
  }

  return (
    <PlanProvider client={auth.client} userId={auth.user.id}>
      <PlanAccessGate>
        <Workspace
          key={auth.user.id}
          client={auth.client}
          userId={auth.user.id}
          email={auth.user.email ?? ""}
          onOpenPlans={openPlans}
        />
      </PlanAccessGate>
    </PlanProvider>
  )
}

function Workspace({
  client,
  userId,
  email,
  previewData,
  onExitPreview,
  onOpenPlans,
}: {
  client: SupabaseClient | null
  userId: string
  email: string
  previewData?: AppData
  onExitPreview?: () => void
  onOpenPlans: () => void
}) {
  const plan = usePlan()
  const {
    data,
    setData,
    loading,
    saving,
    error: saveError,
    loadError,
    upgradeRequiredPlan,
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
  const [page, setPage] = useState<Page>(() =>
    pageForPathname(window.location.pathname),
  )
  const [search, setSearch] = useState("")
  const [menu, setMenu] = useState(false)
  const [lockedScreenPrompt, setLockedScreenPrompt] = useState(false)
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
  useLayoutEffect(() => {
    if (!loading) plan.setWorkspaceData(data)
  }, [data, loading, plan.setWorkspaceData])
  useEffect(() => {
    if (upgradeRequiredPlan) {
      plan.recommendPlan(upgradeRequiredPlan)
    }
  }, [plan.recommendPlan, upgradeRequiredPlan])
  const navigateToPage = (nextPage: Page) => {
    window.history.pushState({}, "", pathForPage(nextPage))
    setPage(nextPage)
    setLockedScreenPrompt(isLockedScreen(nextPage, plan.hasPaidPlan))
  }
  useEffect(() => {
    const handlePopState = () => {
      const nextPage = pageForPathname(window.location.pathname)
      setPage(nextPage)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])
  useEffect(() => {
    setLockedScreenPrompt(isLockedScreen(page, plan.hasPaidPlan))
  }, [page, plan.hasPaidPlan])
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
        fields: plan.can("copyAdvanced")
          ? copyFields
          : copyFields.map((field) =>
              field.key === "type"
                ? { ...field, options: ["Hook", "CTA"] }
                : field,
            ),
        defaults: { type: "Hook" },
      },
      videos: {
        title: modal.item ? "Editar vídeo" : "Novo vídeo",
        fields: plan.can("videoStoryboardAi")
          ? videoFields
          : videoFields.filter((field) => field.key !== "storyboard"),
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
  }, [modal, plan])

  const saveModal = async (
    values: Record<string, string>,
    files: Record<string, File>,
  ) => {
    if (!modal) return
    const collection = modal.collection
    const old = modal.item
    const image = files.image
    const newResource: Partial<Record<Collection, PlanResource>> = {
      products: "products",
      creators: "creators",
    }
    const resource = newResource[collection]
    if (!old && resource && !plan.canCreate(resource)) {
      setModal(null)
      promptForResourceUpgrade(resource)
      return
    }
    const copyFeature =
      collection === "copies" ? copyFeatureForType(values.type ?? "") : null
    if (copyFeature && !plan.can(copyFeature)) {
      setModal(null)
      plan.openUpgrade(copyFeature)
      return
    }
    if (
      collection === "videos" &&
      values.storyboard?.trim() &&
      values.storyboard !== old?.storyboard &&
      !plan.can("videoStoryboardAi")
    ) {
      setModal(null)
      plan.openUpgrade("videoStoryboardAi")
      return
    }
    if (image && client) {
      try {
        values.image = await uploadWorkspaceImage(
          client,
          collection,
          image,
          !old && !(collection === "videos" && values.status === "Publicado"),
        )
      } catch (uploadError) {
        if (uploadError instanceof PlanUpgradeRequiredError) {
          plan.recommendPlan(uploadError.requiredPlan)
        }
        throw uploadError
      }
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
  const promptForResourceUpgrade = (resource: PlanResource) => {
    const recommended = minimumPlanForResource(
      resource,
      plan.user.usage[resource],
    )
    if (recommended) plan.recommendPlan(recommended)
    else plan.openUpgrade()
  }
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
  const importFeedbackData = async (file: File) => {
    if (!plan.can("feedbackImport")) {
      plan.openUpgrade("feedbackImport")
      throw new Error("A importação de resultados está disponível no Premium.")
    }
    const feedbacks = parseFeedbackCsv(await file.text())
    if (!client) {
      setData((current) => ({
        ...current,
        feedbacks: [...current.feedbacks, ...feedbacks],
      }))
      return
    }
    const imported = await importFeedbacks(client, feedbacks)
    setData(imported.data)
  }
  const toggleStep = (id: string) =>
    setData((current) => ({
      ...current,
      completedSteps: current.completedSteps.includes(id)
        ? current.completedSteps.filter((stepId) => stepId !== id)
        : [...current.completedSteps, id],
    }))
  const createCampaign = () => {
    open("videos")
  }
  const duplicateCampaign = () => {
    const source = data.videos[0]
    if (!source) {
      setActionMessage(
        "Não há campanhas para duplicar. Crie um vídeo no Video Lab primeiro.",
      )
      navigateToPage("videos")
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
    navigateToPage("videos")
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

  const visiblePage = page
  const screenLocked = isLockedScreen(page, plan.hasPaidPlan)
  let content: ReactNode
  if (screenLocked)
    content = (
      <>
        <PageTitle
          area={
            page === "references" ? "06" : page === "feedbacks" ? "07" : "09"
          }
          title={pageNames[page]}
          subtitle="Esta área faz parte dos recursos dos planos pagos."
        />
        <section className="plan-locked" role="note">
          <span aria-hidden="true">🔒</span>
          <div>
            <strong>Conteúdo bloqueado para contas sem plano pago</strong>
            <p>
              Seus dados continuam protegidos. Consulte os planos para liberar
              esta área.
            </p>
          </div>
          <Button variant="secondary" onClick={onOpenPlans}>
            Ver planos
          </Button>
        </section>
      </>
    )
  else if (visiblePage === "dashboard")
    content = (
      <Dashboard
        data={data}
        go={navigateToPage}
        createCampaign={createCampaign}
        toggleStep={toggleStep}
      />
    )
  else if (visiblePage === "products")
    content = (
      <Products
        items={data.products}
        search={search}
        add={() => {
          if (plan.canCreate("products")) open("products")
          else promptForResourceUpgrade("products")
        }}
        usage={`${plan.user.usage.products}/${plan.getLimit("products") ?? "ilimitado"}`}
        edit={(item) => open("products", item)}
        remove={(id) => remove("products", id)}
        resolveImage={resolveImage}
      />
    )
  else if (visiblePage === "creators")
    content = (
      <Creators
        items={data.creators}
        search={search}
        copyPrompt={(prompt) => void copyText(prompt, "Prompt")}
        add={() => {
          if (
            plan.can("creatorProfileCreation") &&
            plan.canCreate("creators")
          ) {
            open("creators")
          } else promptForResourceUpgrade("creators")
        }}
        usage={`${plan.user.usage.creators}/${plan.getLimit("creators") ?? "ilimitado"}`}
        edit={(item) => open("creators", item)}
        remove={(id) => remove("creators", id)}
        resolveImage={resolveImage}
      />
    )
  else if (visiblePage === "copies")
    content = (
      <Copies
        items={data.copies}
        search={search}
        copyContent={(text) => void copyText(text, "Copy")}
        canAdvanced={plan.can("copyAdvanced")}
        onUpgrade={() => plan.openUpgrade("copyAdvanced")}
        add={() => open("copies")}
        edit={(item) => open("copies", item)}
        remove={(id) => remove("copies", id)}
      />
    )
  else if (visiblePage === "videos")
    content = (
      <Videos
        items={data.videos}
        search={search}
        add={createCampaign}
        edit={(item) => open("videos", item)}
        move={moveVideo}
        remove={(id) => remove("videos", id)}
        resolveImage={resolveImage}
      />
    )
  else if (visiblePage === "references")
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
  else if (visiblePage === "feedbacks")
    content = (
      <Feedbacks
        items={data.feedbacks}
        search={search}
        add={() => open("feedbacks")}
        edit={(item) => open("feedbacks", item)}
        remove={(id) => remove("feedbacks", id)}
        toggle={toggleFeedback}
        canImport={plan.can("feedbackImport")}
        onUpgrade={() => plan.openUpgrade("feedbackImport")}
        importData={importFeedbackData}
      />
    )
  else if (visiblePage === "drafts")
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
        page={visiblePage}
        setPage={navigateToPage}
        open={menu}
        close={() => setMenu(false)}
        preview={Boolean(previewData)}
        hasPaidPlan={plan.hasPaidPlan}
        onLockedScreen={(lockedPage) => {
          setMenu(false)
          navigateToPage(lockedPage)
        }}
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
          page={visiblePage}
          search={search}
          setSearch={setSearch}
          onMenu={() => setMenu(true)}
          onOpenPlans={onOpenPlans}
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
      {lockedScreenPrompt && screenLocked && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setLockedScreenPrompt(false)
          }
        >
          <section
            className="locked-screen-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="locked-screen-title"
          >
            <img
              className="locked-screen-image"
              src={publicAsset("/images/creator-1.jpg")}
              alt=""
              aria-hidden="true"
            />
            <button
              className="locked-screen-close"
              type="button"
              onClick={() => setLockedScreenPrompt(false)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
            <div className="locked-screen-content">
              <span className="eyebrow">UGC AI CREATOR HUB</span>
              <h2 id="locked-screen-title">Recurso dos planos pagos</h2>
              <p>
                {pageNames[page]} está disponível para quem tem um plano pago.
                Veja as opções para desbloquear este conteúdo.
              </p>
              <Button onClick={onOpenPlans}>Ver planos</Button>
            </div>
          </section>
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
