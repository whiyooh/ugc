import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData } from "../types/domain"
import { LoadingScreen } from "../components/LoadingScreen"
import { PlansPage } from "./PlansPage"
import { usageForWorkspace } from "./usage"
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "./billingClient"
import {
  can as canFeature,
  canCreate as canCreateResource,
  getLimit as limitForResource,
  hasPaidSubscription,
  type PlanUser,
  type UserSubscription,
} from "./authorization"
import type { PlanFeature, PlanId, PlanResource } from "./config"

type PlanContextValue = {
  subscription: UserSubscription | null
  hasPaidPlan: boolean
  user: PlanUser
  loading: boolean
  error: string
  can: (feature: PlanFeature) => boolean
  getLimit: (resource: PlanResource) => number | null
  canCreate: (resource: PlanResource) => boolean
  setWorkspaceData: (data: AppData) => void
  openUpgrade: (feature?: PlanFeature) => void
  recommendPlan: (planId: PlanId) => void
  refresh: () => void
}

const PlanContext = createContext<PlanContextValue | null>(null)

type PlanProviderProps = {
  client: SupabaseClient | null
  userId: string
  children: ReactNode
  previewPlan?: PlanId
}

function isPlanId(value: unknown): value is PlanId {
  return value === "plus" || value === "pro" || value === "premium"
}

function isSubscriptionStatus(
  value: unknown,
): value is UserSubscription["status"] {
  return (
    value === "trial" ||
    value === "active" ||
    value === "pending" ||
    value === "past_due" ||
    value === "expired" ||
    value === "canceled"
  )
}

function parseSubscription(
  value: unknown,
  userId: string,
): UserSubscription | null {
  if (value === null) return null
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("O registro de assinatura retornou um formato inválido.")
  }
  const row = value as Record<string, unknown>
  if (
    !isPlanId(row.plan) ||
    !isSubscriptionStatus(row.status) ||
    typeof row.started_at !== "string" ||
    (row.expires_at !== null && typeof row.expires_at !== "string")
  ) {
    throw new Error("O registro de assinatura tem campos inválidos.")
  }
  return {
    userId,
    plan: row.plan,
    status: row.status,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  }
}

export function PlanProvider({
  client,
  userId,
  children,
  previewPlan,
}: PlanProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    () =>
      previewPlan
        ? {
            userId: "preview",
            plan: previewPlan,
            status: "active",
            startedAt: new Date(0).toISOString(),
            expiresAt: null,
          }
        : null,
  )
  const [usage, setUsage] = useState<PlanUser["usage"]>({
    products: 0,
    creators: 0,
  })
  const [loading, setLoading] = useState(Boolean(client && !previewPlan))
  const [error, setError] = useState("")
  const [upgradeFeature, setUpgradeFeature] = useState<PlanFeature | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [recommendedPlan, setRecommendedPlan] = useState<PlanId | null>(null)
  const [refreshAttempt, setRefreshAttempt] = useState(0)

  const refresh = useCallback(
    () => setRefreshAttempt((attempt) => attempt + 1),
    [],
  )
  const setWorkspaceData = useCallback(
    (data: AppData) => setUsage(usageForWorkspace(data)),
    [],
  )
  const openUpgrade = useCallback((feature?: PlanFeature) => {
    setUpgradeFeature(feature ?? null)
    setRecommendedPlan(null)
    setUpgradeOpen(true)
  }, [])
  const recommendPlan = useCallback((planId: PlanId) => {
    setUpgradeFeature(null)
    setRecommendedPlan(planId)
    setUpgradeOpen(true)
  }, [])
  const subscribe = useCallback(
    async (planId: PlanId) => {
      if (!client) {
        throw new Error("Conecte sua conta para iniciar uma assinatura.")
      }
      const url = await createCheckoutSession(client, planId)
      window.location.assign(url)
    },
    [client],
  )
  const manageSubscription = useCallback(async () => {
    if (!client) {
      throw new Error("Conecte sua conta para gerenciar uma assinatura.")
    }
    const url = await createBillingPortalSession(client)
    window.location.assign(url)
  }, [client])

  useEffect(() => {
    if (!client || previewPlan) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError("")
    void (async () => {
      try {
        const { data, error: queryError } = await client
          .from("user_subscriptions")
          .select("plan, status, started_at, expires_at")
          .eq("user_id", userId)
          .maybeSingle()
        if (queryError) throw queryError
        if (active) setSubscription(parseSubscription(data, userId))
      } catch (requestError) {
        if (active) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : "Erro desconhecido."
          setError(`Não foi possível verificar sua assinatura: ${message}`)
        }
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [client, previewPlan, refreshAttempt, userId])

  useEffect(() => {
    if (!client || previewPlan || !subscription) return
    if (!subscription.expiresAt) return
    const delay = Date.parse(subscription.expiresAt) - Date.now()
    if (Number.isFinite(delay) && delay > 0) {
      const timer = window.setTimeout(refresh, delay + 50)
      return () => window.clearTimeout(timer)
    }
  }, [client, previewPlan, refresh, subscription])

  useEffect(() => {
    if (!client || previewPlan) return
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [client, previewPlan, refresh])

  const user = useMemo<PlanUser>(
    () => ({ subscription, usage }),
    [subscription, usage],
  )
  const value = useMemo<PlanContextValue>(
    () => ({
      subscription,
      hasPaidPlan: hasPaidSubscription(subscription),
      user,
      loading,
      error,
      can: (feature) => canFeature(user, feature),
      getLimit: (resource) => limitForResource(user, resource),
      canCreate: (resource) => canCreateResource(user, resource),
      setWorkspaceData,
      openUpgrade,
      recommendPlan,
      refresh,
    }),
    [
      subscription,
      user,
      loading,
      error,
      setWorkspaceData,
      openUpgrade,
      recommendPlan,
      refresh,
    ],
  )

  return (
    <PlanContext.Provider value={value}>
      {children}
      {upgradeOpen && (
        <PlansPage
          dialog
          requiredFeature={upgradeFeature ?? undefined}
          recommendedPlan={recommendedPlan ?? undefined}
          onSubscribe={subscribe}
          onManageSubscription={manageSubscription}
          onClose={() => {
            setUpgradeOpen(false)
            setUpgradeFeature(null)
            setRecommendedPlan(null)
          }}
        />
      )}
    </PlanContext.Provider>
  )
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext)
  if (!context) {
    throw new Error("usePlan precisa ser usado dentro de PlanProvider.")
  }
  return context
}

export function PlanAccessGate({ children }: { children: ReactNode }) {
  const plan = usePlan()

  if (plan.loading) {
    return <LoadingScreen message="Verificando seu plano..." />
  }
  if (plan.error) {
    return (
      <main className="auth-page">
        <section className="auth-card" role="alert">
          <span className="eyebrow">UGC AI CREATOR HUB</span>
          <h1>Não foi possível verificar seu plano</h1>
          <p>{plan.error}</p>
          <button className="button button-primary" onClick={plan.refresh}>
            Tentar novamente
          </button>
        </section>
      </main>
    )
  }
  return children
}

export function PlanGate({
  feature,
  children,
  fallback,
}: {
  feature: PlanFeature
  children: ReactNode
  fallback?: ReactNode
}) {
  const plan = usePlan()
  if (plan.can(feature)) return children
  return (
    fallback ?? (
      <section className="plan-locked" role="note">
        <span aria-hidden="true">🔒</span>
        <div>
          <strong>Recurso disponível em um plano superior</strong>
          <p>Faça upgrade para continuar usando esta área.</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => plan.openUpgrade(feature)}
        >
          Ver planos
        </button>
      </section>
    )
  )
}
