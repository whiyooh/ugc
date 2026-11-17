import {
  verifyStripeSignature,
  type StripeEvent,
  type StripeSubscription,
} from "../../../src/plans/billing.ts"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export type CheckoutInput = {
  userId: string
  email: string
  customerId?: string
  plan: string
  priceId: string
  successUrl: string
  cancelUrl: string
  idempotencyKey: string
}

export type StripePrice = {
  active: boolean
  currency: string
  unit_amount: number | null
  recurring: StripePriceRecurring | null
}

export type StripePriceRecurring = {
  interval: string
  interval_count: number
}

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<string>
  createPortal(customerId: string, returnUrl: string): Promise<string>
  retrievePrice(priceId: string): Promise<StripePrice>
  retrieveSubscription(subscriptionId: string): Promise<StripeSubscription>
  verifyWebhook(payload: string, signature: string): Promise<StripeEvent>
}

export class StripePaymentProvider implements PaymentProvider {
  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<string> {
    const form = new URLSearchParams()
    form.set("mode", "subscription")
    form.set("locale", "pt-BR")
    form.set("payment_method_types[0]", "card")
    form.set("line_items[0][price]", input.priceId)
    form.set("line_items[0][quantity]", "1")
    form.set("client_reference_id", input.userId)
    if (input.customerId) form.set("customer", input.customerId)
    else form.set("customer_email", input.email)
    form.set("success_url", input.successUrl)
    form.set("cancel_url", input.cancelUrl)
    form.set("metadata[user_id]", input.userId)
    form.set("metadata[plan]", input.plan)
    form.set("subscription_data[metadata][user_id]", input.userId)
    form.set("subscription_data[metadata][plan]", input.plan)

    const session = await this.request<{ url?: string }>(
      "/checkout/sessions",
      form,
      input.idempotencyKey,
    )
    if (
      typeof session.url !== "string" ||
      !session.url.startsWith("https://checkout.stripe.com/")
    ) {
      throw new Error("O Stripe não retornou um endereço seguro de checkout.")
    }
    return session.url
  }

  async createPortal(customerId: string, returnUrl: string): Promise<string> {
    const form = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl,
    })
    const session = await this.request<{ url?: string }>(
      "/billing_portal/sessions",
      form,
    )
    if (
      typeof session.url !== "string" ||
      !session.url.startsWith("https://billing.stripe.com/")
    ) {
      throw new Error("O Stripe não retornou um endereço seguro do portal.")
    }
    return session.url
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<StripeSubscription> {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    )
    return this.readResponse<StripeSubscription>(response)
  }

  async retrievePrice(priceId: string): Promise<StripePrice> {
    const response = await fetch(
      `https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    )
    return this.readResponse<StripePrice>(response)
  }

  async verifyWebhook(
    payload: string,
    signature: string,
  ): Promise<StripeEvent> {
    const valid = await verifyStripeSignature(
      payload,
      signature,
      this.webhookSecret,
    )
    if (!valid) throw new Error("Assinatura do webhook inválida.")

    const event: unknown = JSON.parse(payload)
    if (
      !isRecord(event) ||
      typeof event.id !== "string" ||
      typeof event.type !== "string" ||
      typeof event.created !== "number" ||
      !isRecord(event.data) ||
      !isRecord(event.data.object)
    ) {
      throw new Error("O evento recebido do Stripe tem formato inválido.")
    }
    return {
      id: event.id,
      type: event.type,
      created: event.created,
      data: { object: event.data.object },
    }
  }

  private async request<T,>(
    path: string,
    body: URLSearchParams,
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    }
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey
    const response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: "POST",
      headers,
      body,
    })
    return this.readResponse<T>(response)
  }

  private async readResponse<T,>(response: Response): Promise<T> {
    const result: unknown = await response.json()
    if (!response.ok) {
      const error =
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error &&
        typeof result.error === "object" &&
        "message" in result.error &&
        typeof result.error.message === "string"
          ? result.error.message
          : `O Stripe respondeu com HTTP ${response.status}.`
      throw new Error(error)
    }
    return result as T
  }
}
