import { describe, expect, it } from "vitest"
import {
  can,
  canCreate,
  getLimit,
  hasActiveSubscription,
  hasPaidSubscription,
  minimumPlanForFeature,
  minimumPlanForResource,
  type PlanUser,
  type UserSubscription,
} from "./authorization"
import {
  aiActionCosts,
  formatPlanPrice,
  plans,
  trialCreditGrant,
} from "./config"

const now = new Date("2026-11-15T12:00:00.000Z")

function user(plan: UserSubscription["plan"]): PlanUser {
  return {
    subscription: {
      userId: "user-1",
      plan,
      status: "active",
      startedAt: "2026-10-01T00:00:00.000Z",
      expiresAt: null,
    },
    usage: { products: 0, creators: 0 },
  }
}

describe("plan authorization", () => {
  it("formats monthly prices in Brazilian reais", () => {
    expect(formatPlanPrice(5590)).toBe("R$\u00a055,90")
  })

  it("keeps provisional AI credits and action costs in plan configuration", () => {
    expect(plans.plus.monthlyAiCredits).toBe(100)
    expect(plans.pro.monthlyAiCredits).toBe(300)
    expect(plans.premium.monthlyAiCredits).toBe(800)
    expect(trialCreditGrant).toBe(30)
    expect(aiActionCosts).toEqual({
      hook: 1,
      caption: 1,
      cta: 1,
      shortScript: 2,
      storyboard: 3,
      image: 5,
    })
  })

  it("applies Plus features and limits", () => {
    const account = user("plus")
    expect(can(account, "copyHooksCtas", now)).toBe(true)
    expect(can(account, "copyAdvanced", now)).toBe(false)
    expect(can(account, "videoKanban", now)).toBe(true)
    expect(can(account, "references", now)).toBe(false)
    expect(can(account, "creatorProfileCreation", now)).toBe(false)
    expect(getLimit(account, "products", now)).toBe(5)
    expect(getLimit(account, "creators", now)).toBe(2)
  })

  it("applies Pro features and limits", () => {
    const account = user("pro")
    expect(can(account, "copyAdvanced", now)).toBe(true)
    expect(can(account, "videoStoryboardAi", now)).toBe(true)
    expect(can(account, "references", now)).toBe(true)
    expect(can(account, "feedbackManual", now)).toBe(true)
    expect(can(account, "feedbackImport", now)).toBe(false)
    expect(can(account, "creatorProfileCreation", now)).toBe(false)
    expect(getLimit(account, "products", now)).toBe(20)
    expect(getLimit(account, "creators", now)).toBe(6)
    expect(
      canCreate(
        { ...account, usage: { products: 19, creators: 5 } },
        "products",
        now,
      ),
    ).toBe(true)
  })

  it("applies Premium features and unlimited limits", () => {
    const account = user("premium")
    expect(can(account, "feedbackImport", now)).toBe(true)
    expect(can(account, "creatorProfileCreation", now)).toBe(true)
    expect(getLimit(account, "products", now)).toBeNull()
    expect(getLimit(account, "creators", now)).toBeNull()
    expect(
      canCreate(
        { ...account, usage: { products: 100, creators: 100 } },
        "products",
        now,
      ),
    ).toBe(true)
  })

  it("blocks creation at the limit and allows it below the limit", () => {
    const account = {
      ...user("plus"),
      usage: { products: 4, creators: 0 },
    }
    expect(canCreate(account, "products", now)).toBe(true)
    expect(
      canCreate(
        { ...account, usage: { ...account.usage, products: 5 } },
        "products",
        now,
      ),
    ).toBe(false)
  })

  it("keeps downgrade data and blocks only further creations", () => {
    const account = {
      ...user("plus"),
      usage: { products: 8, creators: 0 },
    }
    expect(getLimit(account, "products", now)).toBe(5)
    expect(canCreate(account, "products", now)).toBe(false)
  })

  it.each([
    ["missing", null],
    ["pending", { ...user("pro").subscription!, status: "pending" as const }],
    [
      "expired",
      { ...user("pro").subscription!, expiresAt: "2026-11-14T12:00:00.000Z" },
    ],
    [
      "not started",
      { ...user("pro").subscription!, startedAt: "2026-11-16T00:00:00.000Z" },
    ],
  ])("denies access for a %s subscription", (_label, subscription) => {
    expect(
      hasActiveSubscription(subscription as UserSubscription | null, now),
    ).toBe(false)
    const account: PlanUser = {
      subscription: subscription as UserSubscription | null,
      usage: { products: 0, creators: 0 },
    }
    expect(can(account, "dashboard", now)).toBe(false)
    expect(getLimit(account, "products", now)).toBe(0)
    expect(canCreate(account, "products", now)).toBe(false)
  })

  it("keeps canceled access until the paid period ends", () => {
    const subscription: UserSubscription = {
      ...user("pro").subscription!,
      status: "canceled",
      expiresAt: "2026-11-16T12:00:00.000Z",
    }
    expect(hasActiveSubscription(subscription, now)).toBe(true)
    expect(
      can({ subscription, usage: user("pro").usage }, "references", now),
    ).toBe(true)
    expect(
      hasActiveSubscription(
        { ...subscription, expiresAt: "2026-11-14T12:00:00.000Z" },
        now,
      ),
    ).toBe(false)
  })

  it("keeps access during the configured payment grace period only", () => {
    const subscription: UserSubscription = {
      ...user("pro").subscription!,
      status: "past_due",
      expiresAt: "2026-11-18T12:00:00.000Z",
    }
    expect(hasActiveSubscription(subscription, now)).toBe(true)
    expect(hasPaidSubscription(subscription, now)).toBe(true)
    expect(
      can({ subscription, usage: user("pro").usage }, "references", now),
    ).toBe(true)
    expect(
      hasActiveSubscription(
        { ...subscription, expiresAt: "2026-11-15T11:59:59.000Z" },
        now,
      ),
    ).toBe(false)
  })

  it("recognizes paid plans without treating a trial as paid", () => {
    expect(hasPaidSubscription(null, now)).toBe(false)
    for (const plan of ["plus", "pro", "premium"] as const) {
      expect(hasPaidSubscription(user(plan).subscription, now)).toBe(true)
    }

    expect(
      hasPaidSubscription(
        { ...user("plus").subscription!, status: "trial" },
        now,
      ),
    ).toBe(false)
    expect(
      hasPaidSubscription(
        { ...user("plus").subscription!, status: "pending" },
        now,
      ),
    ).toBe(false)
    expect(
      hasPaidSubscription(
        {
          ...user("plus").subscription!,
          status: "canceled",
          expiresAt: "2026-11-16T12:00:00.000Z",
        },
        now,
      ),
    ).toBe(true)
    expect(
      hasPaidSubscription(
        {
          ...user("plus").subscription!,
          status: "canceled",
          expiresAt: "2026-11-14T12:00:00.000Z",
        },
        now,
      ),
    ).toBe(false)
  })

  it("grants Plus access during trial without a calendar expiry", () => {
    const subscription: UserSubscription = {
      ...user("pro").subscription!,
      plan: "plus",
      status: "trial",
      expiresAt: null,
    }
    expect(hasActiveSubscription(subscription, now)).toBe(true)
    const account = { subscription, usage: { products: 0, creators: 0 } }
    expect(can(account, "copyHooksCtas", now)).toBe(true)
    expect(can(account, "copyAdvanced", now)).toBe(false)
    expect(canCreate(account, "products", now)).toBe(true)
    expect(
      hasActiveSubscription(
        { ...subscription, expiresAt: "2026-11-15T11:59:59.000Z" },
        now,
      ),
    ).toBe(false)
  })

  it("identifies the minimum plan for features and remaining capacity", () => {
    expect(minimumPlanForFeature("references")).toBe("pro")
    expect(minimumPlanForFeature("feedbackImport")).toBe("premium")
    expect(minimumPlanForResource("products", 5)).toBe("pro")
    expect(minimumPlanForResource("products", 20)).toBe("premium")
  })
})
