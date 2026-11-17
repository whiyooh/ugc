import { useState } from "react"
import { Button, Tag } from "../components/ui"
import {
  formatPlanPrice,
  planIds,
  plans,
  type PlanFeature,
  type PlanId,
} from "./config"
import { minimumPlanForFeature } from "./authorization"

export function PlansPage({
  dialog = false,
  requiredFeature,
  recommendedPlan,
  onClose,
  onBack,
  onCheckStatus,
  onSubscribe,
  onManageSubscription,
}: {
  dialog?: boolean
  requiredFeature?: PlanFeature
  recommendedPlan?: PlanId
  onClose?: () => void
  onBack?: () => void
  onCheckStatus?: () => Promise<string>
  onSubscribe?: (plan: PlanId) => Promise<void>
  onManageSubscription?: () => Promise<void>
}) {
  const [message, setMessage] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") === "success") {
      return "Pagamento recebido. Estamos confirmando sua assinatura; o plano será liberado após a confirmação segura do Stripe."
    }
    if (params.get("checkout") === "cancelled") {
      return "Checkout cancelado. Nenhuma assinatura foi ativada."
    }
    if (params.has("portal")) return "Você voltou do portal de gerenciamento."
    return ""
  })
  const [error, setError] = useState("")
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null)
  const [busyAction, setBusyAction] = useState(false)
  const minimumPlan = requiredFeature
    ? minimumPlanForFeature(requiredFeature)
    : null

  const subscribe = async (planId: PlanId) => {
    setError("")
    setMessage("")
    if (!onSubscribe) {
      setError("Entre na sua conta para iniciar uma assinatura.")
      return
    }
    setBusyPlan(planId)
    try {
      await onSubscribe(planId)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível iniciar o checkout.",
      )
    } finally {
      setBusyPlan(null)
    }
  }

  const manageSubscription = async () => {
    setError("")
    setMessage("")
    if (!onManageSubscription) {
      setError("Entre na sua conta para gerenciar uma assinatura.")
      return
    }
    setBusyAction(true)
    try {
      await onManageSubscription()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível abrir o portal de assinatura.",
      )
    } finally {
      setBusyAction(false)
    }
  }

  const checkStatus = async () => {
    if (!onCheckStatus) return
    setError("")
    setBusyAction(true)
    try {
      setMessage(await onCheckStatus())
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar a assinatura.",
      )
    } finally {
      setBusyAction(false)
    }
  }

  const content = (
    <div className={dialog ? "plans-dialog" : ""}>
      <header className="plans-heading">
        {onBack && (
          <button className="link-button" onClick={onBack}>
            ← Voltar ao aplicativo
          </button>
        )}
        <span className="eyebrow">UGC AI CREATOR HUB</span>
        <h1>
          {dialog ? "Desbloqueie mais possibilidades." : "Escolha seu plano."}
        </h1>
        <p>
          {dialog
            ? "Seus dados continuam guardados. Escolha um plano para liberar este recurso."
            : "Organize seus produtos, criadoras e campanhas em um só lugar."}
        </p>
        {requiredFeature && (
          <p className="plan-required">
            {minimumPlan
              ? `Este recurso está disponível a partir do plano ${plans[minimumPlan].name}.`
              : "Confira os limites e recursos de cada plano."}
          </p>
        )}
      </header>
      <div className="plan-cards">
        {planIds.map((planId) => {
          const plan = plans[planId]
          return (
            <article
              className={`plan-card ${
                plan.popular ? "plan-card-popular" : ""
              } ${recommendedPlan === planId ? "plan-card-recommended" : ""}`}
              key={planId}
            >
              {plan.popular && <Tag tone="purple">Mais popular</Tag>}
              {recommendedPlan === planId && (
                <Tag tone="purple">Recomendado</Tag>
              )}
              <h2>{plan.name}</h2>
              <p className="plan-price">
                {formatPlanPrice(plan.priceInCents)}
                <span>/mês</span>
              </p>
              <ul>
                {plan.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
              <Button
                onClick={() => void subscribe(planId)}
                disabled={busyPlan !== null || busyAction}
              >
                {busyPlan === planId
                  ? "Conectando ao Stripe..."
                  : "Assinar com cartão"}
              </Button>
            </article>
          )
        })}
      </div>
      {message && (
        <p className="plan-interest" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="plan-error" role="alert">
          {error}
        </p>
      )}
      {!dialog && (
        <>
          <p className="plans-footnote">
            Pagamento mensal via cartão no checkout seguro do Stripe. O plano só
            é liberado após a confirmação do pagamento pelo webhook.
          </p>
          {(onManageSubscription || onCheckStatus) && (
            <p className="plans-footnote">
              {onManageSubscription && (
                <>
                  Já tem uma assinatura?{" "}
                  <button
                    className="link-button"
                    disabled={busyAction}
                    onClick={() => void manageSubscription()}
                  >
                    {busyAction ? "Aguarde..." : "Gerenciar assinatura"}
                  </button>
                </>
              )}
              {onCheckStatus && (
                <>
                  {" "}
                  {onManageSubscription && "·"}{" "}
                  <button
                    className="link-button"
                    disabled={busyAction}
                    onClick={() => void checkStatus()}
                  >
                    Verificar assinatura
                  </button>
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )

  if (!dialog) {
    return <main className="plans-page">{content}</main>
  }
  return (
    <div
      className="modal-backdrop plans-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose?.()
      }
    >
      <section
        className="plans-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Planos de assinatura"
      >
        <button
          className="plans-close"
          type="button"
          onClick={onClose}
          aria-label="Fechar planos"
        >
          ×
        </button>
        {content}
      </section>
    </div>
  )
}
