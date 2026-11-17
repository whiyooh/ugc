import type { SupabaseClient } from "@supabase/supabase-js"
import type { PlanId } from "./config"

type BillingResponse = {
  url?: unknown
  message?: unknown
}

async function errorMessage(error: Error): Promise<string> {
  if ("context" in error && error.context instanceof Response) {
    try {
      const body: unknown = await error.context.clone().json()
      if (
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        return body.message
      }
    } catch {
      return error.message
    }
  }
  return error.message
}

async function invokeBilling(
  client: SupabaseClient,
  action: "checkout" | "portal",
  plan?: PlanId,
): Promise<string> {
  const { data, error } = await client.functions.invoke<BillingResponse>(
    "billing-api",
    {
      body: {
        action,
        ...(plan ? { plan, idempotencyKey: crypto.randomUUID() } : {}),
      },
    },
  )
  if (error) throw new Error(await errorMessage(error))
  if (!data || typeof data.url !== "string") {
    throw new Error("O servidor de cobrança não retornou um endereço válido.")
  }
  return data.url
}

export function createCheckoutSession(
  client: SupabaseClient,
  plan: PlanId,
): Promise<string> {
  return invokeBilling(client, "checkout", plan)
}

export function createBillingPortalSession(
  client: SupabaseClient,
): Promise<string> {
  return invokeBilling(client, "portal")
}
