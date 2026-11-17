import { planIds, type PlanId } from "./config.ts"

export type StripeEvent = {
  id: string
  type: string
  created: number
  data: { object: Record<string, unknown> }
}

export type StripeSubscription = {
  id: string
  customer: string | { id: string }
  status: string
  cancel_at_period_end: boolean
  current_period_start?: number
  current_period_end?: number
  metadata: Record<string, string>
  items: {
    data: Array<{
      price: { id: string }
      current_period_start?: number
      current_period_end?: number
    }>
  }
}

export type BillingStatus = "pending" | "unchanged" | "active" | "past_due" | "canceled" | "expired"

export function billingStatusForEvent(
  eventType: string,
  subscriptionStatus: string,
  cancelAtPeriodEnd: boolean,
  periodEnd: number | null,
  nowSeconds: number,
): BillingStatus {
  if (
    eventType === "invoice.paid" ||
    eventType === "invoice.payment_succeeded"
  ) {
    if (subscriptionStatus === "canceled" || cancelAtPeriodEnd) {
      return periodEnd !== null && periodEnd > nowSeconds
        ? "canceled"
        : "expired"
    }
    return "active"
  }
  if (
    eventType === "customer.subscription.deleted" ||
    subscriptionStatus === "canceled"
  ) {
    return periodEnd !== null && periodEnd > nowSeconds ? "canceled" : "expired"
  }
  if (subscriptionStatus === "incomplete_expired") return "expired"
  if (cancelAtPeriodEnd) return "canceled"
  if (
    eventType === "invoice.payment_failed" ||
    eventType === "invoice.payment_action_required" ||
    subscriptionStatus === "past_due" ||
    subscriptionStatus === "unpaid"
  ) {
    return "past_due"
  }
  if (
    eventType === "customer.subscription.updated" &&
    subscriptionStatus === "active"
  ) {
    return "unchanged"
  }
  return "pending"
}

export function paymentGraceExpiry(
  eventCreated: number,
  graceDays: number,
): string {
  return new Date(
    (eventCreated + graceDays * 24 * 60 * 60) * 1000,
  ).toISOString()
}

export function planFromPriceId(
  priceId: string,
  configuredPriceIds: Partial<Record<PlanId, string>>,
): PlanId | null {
  return (
    planIds.find((planId) => configuredPriceIds[planId] === priceId) ?? null
  )
}

export function subscriptionIdFromEvent(event: StripeEvent): string | null {
  const object = event.data.object
  if (typeof object.subscription === "string") return object.subscription
  if (
    object.subscription &&
    typeof object.subscription === "object" &&
    "id" in object.subscription &&
    typeof object.subscription.id === "string"
  ) {
    return object.subscription.id
  }

  const parent = object.parent
  if (!parent || typeof parent !== "object") return null
  const details = (parent as Record<string, unknown>).subscription_details
  if (!details || typeof details !== "object") return null
  const subscription = (details as Record<string, unknown>).subscription
  if (typeof subscription === "string") return subscription
  if (
    subscription &&
    typeof subscription === "object" &&
    "id" in subscription &&
    typeof subscription.id === "string"
  ) {
    return subscription.id
  }
  return null
}

function decodeHex(value: string): Uint8Array | null {
  if (!/^[\da-f]{64}$/i.test(value)) return null
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) =>
    Number.parseInt(byte, 16),
  )
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false
  const parts = signatureHeader.split(",").map((part) => part.trim())
  const timestampPart = parts.find((part) => part.startsWith("t="))
  const timestamp = Number(timestampPart?.slice(2))
  if (
    !Number.isSafeInteger(timestamp) ||
    Math.abs(nowSeconds - timestamp) > toleranceSeconds
  ) {
    return false
  }

  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => decodeHex(part.slice(3)))
    .filter((value): value is Uint8Array => value !== null)
  if (!signatures.length) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const digest = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    ),
  )
  return signatures.some((signature) => equalBytes(digest, signature))
}
