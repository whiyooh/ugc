import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  billingStatusForEvent,
  paymentGraceExpiry,
  planFromPriceId,
  subscriptionIdFromEvent,
  verifyStripeSignature,
  type StripeEvent,
} from "./billing"

describe("Stripe billing helpers", () => {
  it("maps configured Stripe prices to their plans", () => {
    expect(
      planFromPriceId("price_pro_test", {
        plus: "price_plus_test",
        pro: "price_pro_test",
        premium: "price_premium_test",
      }),
    ).toBe("pro")
    expect(planFromPriceId("price_unknown", {})).toBeNull()
  })

  it("extracts a subscription id from invoice event variants", () => {
    const direct = {
      id: "evt_direct",
      type: "invoice.paid",
      created: 1,
      data: { object: { subscription: "sub_direct" } },
    } satisfies StripeEvent
    const nested = {
      id: "evt_nested",
      type: "invoice.paid",
      created: 1,
      data: {
        object: {
          parent: {
            subscription_details: { subscription: { id: "sub_nested" } },
          },
        },
      },
    } satisfies StripeEvent

    expect(subscriptionIdFromEvent(direct)).toBe("sub_direct")
    expect(subscriptionIdFromEvent(nested)).toBe("sub_nested")
    expect(
      subscriptionIdFromEvent({
        ...direct,
        data: { object: {} },
      }),
    ).toBeNull()
  })

  it("verifies signatures, rejects tampering, and enforces timestamp tolerance", async () => {
    const secret = "whsec_test_secret"
    const payload = JSON.stringify({ id: "evt_test", type: "invoice.paid" })
    const timestamp = 1_800_000_000
    const digest = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex")
    const header = `t=${timestamp},v1=${digest}`

    await expect(
      verifyStripeSignature(payload, header, secret, timestamp),
    ).resolves.toBe(true)
    await expect(
      verifyStripeSignature(`${payload} `, header, secret, timestamp),
    ).resolves.toBe(false)
    await expect(
      verifyStripeSignature(payload, header, secret, timestamp + 301),
    ).resolves.toBe(false)
    await expect(
      verifyStripeSignature(payload, null, secret, timestamp),
    ).resolves.toBe(false)
  })

  it("maps payment, failure, cancellation, and expiration events to access states", () => {
    const now = 1_800_000_000
    const periodEnd = now + 30 * 24 * 60 * 60

    expect(
      billingStatusForEvent("invoice.paid", "active", false, periodEnd, now),
    ).toBe("active")
    expect(
      billingStatusForEvent("invoice.paid", "past_due", false, periodEnd, now),
    ).toBe("active")
    expect(
      billingStatusForEvent(
        "invoice.payment_failed",
        "past_due",
        false,
        periodEnd,
        now,
      ),
    ).toBe("past_due")
    expect(
      billingStatusForEvent(
        "customer.subscription.updated",
        "active",
        true,
        periodEnd,
        now,
      ),
    ).toBe("canceled")
    expect(
      billingStatusForEvent(
        "customer.subscription.deleted",
        "canceled",
        false,
        periodEnd,
        now,
      ),
    ).toBe("canceled")
    expect(
      billingStatusForEvent(
        "customer.subscription.deleted",
        "canceled",
        false,
        now - 1,
        now,
      ),
    ).toBe("expired")
    expect(
      billingStatusForEvent(
        "customer.subscription.created",
        "incomplete",
        false,
        periodEnd,
        now,
      ),
    ).toBe("pending")
    expect(
      billingStatusForEvent(
        "customer.subscription.updated",
        "active",
        false,
        periodEnd,
        now,
      ),
    ).toBe("unchanged")
    expect(paymentGraceExpiry(now, 3)).toBe(
      new Date((now + 3 * 24 * 60 * 60) * 1000).toISOString(),
    )
  })
})
