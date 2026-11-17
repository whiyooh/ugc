import { createClient } from "npm:@supabase/supabase-js@2"
import { planIds, plans, type PlanId } from "../../../src/plans/config.ts"
import { StripePaymentProvider } from "../_shared/paymentProvider.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isPlanId(value: unknown): value is PlanId {
  return planIds.some((planId) => planId === value)
}

function configuredPriceIds(): Partial<Record<PlanId, string>> {
  return {
    plus: Deno.env.get("STRIPE_PRICE_PLUS"),
    pro: Deno.env.get("STRIPE_PRICE_PRO"),
    premium: Deno.env.get("STRIPE_PRICE_PREMIUM"),
  }
}

function appBaseUrl(): string | null {
  const configured = Deno.env.get("APP_BASE_URL")?.trim()
  if (!configured) return null
  try {
    const url = new URL(configured)
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    ) {
      return null
    }
    return url.toString().replace(/\/+$/, "")
  } catch {
    return null
  }
}

function providerFromEnvironment(): StripePaymentProvider | null {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim()
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim()
  if (
    !secretKey ||
    !/^(?:sk|rk)_test_/.test(secretKey) ||
    !webhookSecret?.startsWith("whsec_")
  ) {
    return null
  }
  return new StripePaymentProvider(secretKey, webhookSecret)
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (request.method !== "POST") {
    return jsonResponse({ code: "METHOD_NOT_ALLOWED" }, 405)
  }

  const authorization = request.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ code: "UNAUTHORIZED" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const stripe = providerFromEnvironment()
  const baseUrl = appBaseUrl()
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripe || !baseUrl) {
    console.error("Configuração da função billing-api está incompleta.")
    return jsonResponse({ code: "SERVER_CONFIGURATION_ERROR" }, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) return jsonResponse({ code: "UNAUTHORIZED" }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body: unknown = await request.json()
    if (!isRecord(body) || typeof body.action !== "string") {
      return jsonResponse({ code: "INVALID_REQUEST" }, 400)
    }

    if (body.action === "checkout") {
      if (!isPlanId(body.plan)) {
        return jsonResponse({ code: "INVALID_PLAN" }, 400)
      }
      if (
        typeof body.idempotencyKey !== "string" ||
        !/^[\w-]{16,128}$/.test(body.idempotencyKey)
      ) {
        return jsonResponse({ code: "INVALID_IDEMPOTENCY_KEY" }, 400)
      }
      const priceId = configuredPriceIds()[body.plan]
      if (!priceId || !user.email) {
        return jsonResponse({ code: "PLAN_NOT_CONFIGURED" }, 503)
      }

      const { data: subscription, error } = await admin
        .from("user_subscriptions")
        .select(
          "status, expires_at, stripe_customer_id, stripe_subscription_id",
        )
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) throw error
      if (subscription?.stripe_subscription_id) {
        const keepsAccess =
          subscription.status === "active" ||
          subscription.status === "past_due" ||
          subscription.status === "trial" ||
          (subscription.expires_at &&
            Date.parse(subscription.expires_at) > Date.now())
        if (keepsAccess || subscription.status === "pending") {
          return jsonResponse(
            {
              code: "SUBSCRIPTION_ALREADY_EXISTS",
              message:
                "Já existe uma assinatura em andamento. Use o portal para gerenciá-la.",
            },
            409,
          )
        }
      }
      if (
        subscription?.status === "active" ||
        subscription?.status === "past_due" ||
        (subscription?.status === "canceled" &&
          subscription.expires_at &&
          Date.parse(subscription.expires_at) > Date.now())
      ) {
        return jsonResponse(
          {
            code: "ACTIVE_SUBSCRIPTION_EXISTS",
            message:
              "Sua conta já tem um plano ativo. Use o portal para gerenciá-lo.",
          },
          409,
        )
      }

      const stripePrice = await stripe.retrievePrice(priceId)
      if (
        !stripePrice.active ||
        stripePrice.currency !== "brl" ||
        stripePrice.unit_amount !== plans[body.plan].priceInCents ||
        stripePrice.recurring?.interval !== "month" ||
        stripePrice.recurring.interval_count !== 1
      ) {
        console.error(
          "O preço Stripe não corresponde à configuração do plano.",
          {
            plan: body.plan,
          },
        )
        return jsonResponse(
          {
            code: "PLAN_PRICE_MISMATCH",
            message:
              "O preço deste plano ainda não está configurado corretamente no Stripe.",
          },
          503,
        )
      }

      const url = await stripe.createCheckout({
        userId: user.id,
        email: user.email,
        customerId: subscription?.stripe_customer_id ?? undefined,
        plan: body.plan,
        priceId,
        successUrl: `${baseUrl}/planos?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/planos?checkout=cancelled`,
        idempotencyKey: `${user.id}-${body.idempotencyKey}`,
      })
      console.info("stripe_checkout_created", {
        userId: user.id,
        plan: body.plan,
      })
      return jsonResponse({ url })
    }

    if (body.action === "portal") {
      const { data: subscription, error } = await admin
        .from("user_subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) throw error
      if (!subscription?.stripe_customer_id) {
        return jsonResponse(
          {
            code: "SUBSCRIPTION_NOT_FOUND",
            message: "Não encontramos uma assinatura Stripe nesta conta.",
          },
          404,
        )
      }
      const url = await stripe.createPortal(
        subscription.stripe_customer_id,
        `${baseUrl}/planos?portal=returned`,
      )
      console.info("stripe_portal_opened", { userId: user.id })
      return jsonResponse({ url })
    }

    return jsonResponse({ code: "INVALID_ACTION" }, 400)
  } catch (error) {
    console.error("Falha ao processar solicitação de cobrança.", {
      message: error instanceof Error ? error.message : "Erro desconhecido.",
    })
    return jsonResponse(
      {
        code: "BILLING_REQUEST_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar a operação de cobrança.",
      },
      502,
    )
  }
})
