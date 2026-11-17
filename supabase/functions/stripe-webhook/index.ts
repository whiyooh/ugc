import { createClient } from "npm:@supabase/supabase-js@2"
import {
  billingStatusForEvent,
  paymentGraceExpiry,
  planFromPriceId,
  subscriptionIdFromEvent,
  type StripeEvent,
  type StripeSubscription,
} from "../../../src/plans/billing.ts"
import { planIds, type PlanId } from "../../../src/plans/config.ts"
import { StripePaymentProvider } from "../_shared/paymentProvider.ts"

const handledEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.payment_action_required",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function getIdentifier(value: unknown): string | null {
  if (typeof value === "string") return value
  if (isRecord(value)) return getString(value.id)
  return null
}

function subscriptionMetadata(value: unknown): Record<string, string> {
  if (!isRecord(value) || !isRecord(value.metadata)) return {}
  return Object.fromEntries(
    Object.entries(value.metadata).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
}

function configuredPriceIds(): Partial<Record<PlanId, string>> {
  return {
    plus: Deno.env.get("STRIPE_PRICE_PLUS"),
    pro: Deno.env.get("STRIPE_PRICE_PRO"),
    premium: Deno.env.get("STRIPE_PRICE_PREMIUM"),
  }
}

function isPlanId(value: unknown): value is PlanId {
  return planIds.some((planId) => planId === value)
}

function currentPeriod(
  subscription: StripeSubscription,
): {
  start: number
  end: number
} {
  const firstItem = subscription.items.data[0]
  return {
    start:
      subscription.current_period_start ?? firstItem?.current_period_start ?? 0,
    end: subscription.current_period_end ?? firstItem?.current_period_end ?? 0,
  }
}

function subscriptionIdForEvent(event: StripeEvent): string | null {
  if (event.type === "checkout.session.completed") {
    return getIdentifier(event.data.object.subscription)
  }
  return subscriptionIdFromEvent(event)
}

function metadataFromEvent(event: StripeEvent): Record<string, string> {
  return subscriptionMetadata(event.data.object)
}

function graceDays(): number {
  const configured = Number(Deno.env.get("STRIPE_PAYMENT_GRACE_DAYS") ?? "3")
  return Number.isInteger(configured) && configured >= 0 && configured <= 30
    ? configured
    : 3
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function isValidUserId(value: string): boolean {
  return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ code: "METHOD_NOT_ALLOWED" }, 405)
  }

  const signature = request.headers.get("stripe-signature")
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const stripe =
    stripeSecret && /^(?:sk|rk)_test_/.test(stripeSecret) && webhookSecret
      ? new StripePaymentProvider(stripeSecret, webhookSecret)
      : null
  if (!stripe || !signature || !supabaseUrl || !serviceRoleKey) {
    console.error("Configuração da função stripe-webhook está incompleta.")
    return jsonResponse({ code: "SERVER_CONFIGURATION_ERROR" }, 500)
  }

  let event: StripeEvent
  try {
    event = await stripe.verifyWebhook(await request.text(), signature)
  } catch {
    return jsonResponse({ code: "INVALID_WEBHOOK_SIGNATURE" }, 400)
  }

  if (!handledEvents.has(event.type)) {
    console.info("stripe_webhook_ignored", {
      eventId: event.id,
      eventType: event.type,
    })
    return jsonResponse({ received: true, ignored: true })
  }

  try {
    const subscriptionId = subscriptionIdForEvent(event)
    if (!subscriptionId) {
      throw new Error("Evento de cobrança sem ID de assinatura.")
    }

    const subscription = await stripe.retrieveSubscription(subscriptionId)
    const metadata = {
      ...metadataFromEvent(event),
      ...subscriptionMetadata(subscription),
    }
    const userId = getString(metadata.user_id)
    const configuredPlan = isPlanId(metadata.plan) ? metadata.plan : null
    const priceId = subscription.items.data[0]?.price.id
    const pricePlan = priceId
      ? planFromPriceId(priceId, configuredPriceIds())
      : null
    const plan = pricePlan
    if (!userId || !isValidUserId(userId) || !plan) {
      throw new Error("Metadados de usuário ou plano ausentes na assinatura.")
    }
    if (configuredPlan && pricePlan && configuredPlan !== pricePlan) {
      throw new Error("O plano da assinatura não corresponde ao preço Stripe.")
    }

    const customerId = getIdentifier(subscription.customer)
    if (!customerId) throw new Error("Assinatura Stripe sem cliente.")
    const period = currentPeriod(subscription)
    const periodEndSeconds = period.end > 0 ? period.end : null
    const periodEnd = periodEndSeconds
      ? new Date(periodEndSeconds * 1000).toISOString()
      : null
    const periodStart =
      period.start > 0
        ? new Date(period.start * 1000).toISOString()
        : new Date(event.created * 1000).toISOString()
    const status = billingStatusForEvent(
      event.type,
      subscription.status,
      subscription.cancel_at_period_end,
      periodEndSeconds,
      event.created,
    )
    const graceUntil =
      status === "past_due"
        ? paymentGraceExpiry(event.created, graceDays())
        : null

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await admin.rpc(
      "process_stripe_subscription_event",
      {
        p_event_id: event.id,
        p_event_type: event.type,
        p_event_created: event.created,
        p_user_id: userId,
        p_plan: plan,
        p_customer_id: customerId,
        p_subscription_id: subscription.id,
        p_status: status,
        p_cancel_at_period_end: subscription.cancel_at_period_end,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_grace_until: graceUntil,
      },
    )
    if (error) throw error

    console.info("stripe_webhook_processed", {
      eventId: event.id,
      eventType: event.type,
      result: data,
    })
    return jsonResponse({ received: true })
  } catch (error) {
    console.error("Falha ao processar evento Stripe.", {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "Erro desconhecido.",
    })
    return jsonResponse({ code: "WEBHOOK_PROCESSING_FAILED" }, 500)
  }
})
