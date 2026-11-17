import {
  planIds,
  plans,
  type PlanFeature,
  type PlanId,
  type PlanResource,
} from "./config.ts"

export type SubscriptionStatus = "trial" | "active" | "pending" | "past_due" | "expired" | "canceled"

export type UserSubscription = {
  userId: string
  plan: PlanId
  status: SubscriptionStatus
  startedAt: string
  expiresAt: string | null
}

export type PlanUser = {
  subscription: UserSubscription | null
  usage: Readonly<Record<PlanResource, number>>
}

export class PlanUpgradeRequiredError extends Error {
  readonly code = "PLAN_UPGRADE_REQUIRED"

  constructor(
    readonly requiredPlan: PlanId,
    message: string,
  ) {
    super(message)
    this.name = "PlanUpgradeRequiredError"
  }
}

export function hasActiveSubscription(
  subscription: UserSubscription | null,
  now: Date = new Date(),
): subscription is UserSubscription {
  if (!subscription) return false

  const startedAt = Date.parse(subscription.startedAt)
  if (!Number.isFinite(startedAt) || startedAt > now.getTime()) return false

  if (
    subscription.status !== "trial" &&
    subscription.status !== "active" &&
    subscription.status !== "past_due" &&
    subscription.status !== "canceled"
  ) {
    return false
  }
  if (subscription.expiresAt === null) {
    return subscription.status === "trial" || subscription.status === "active"
  }
  const expiresAt = Date.parse(subscription.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt > now.getTime()
}

export function hasPaidSubscription(
  subscription: UserSubscription | null,
  now: Date = new Date(),
): boolean {
  if (
    !subscription ||
    (subscription.status !== "active" &&
      subscription.status !== "past_due" &&
      subscription.status !== "canceled")
  ) {
    return false
  }

  const startedAt = Date.parse(subscription.startedAt)
  if (!Number.isFinite(startedAt) || startedAt > now.getTime()) return false
  if (subscription.expiresAt === null) return subscription.status === "active"

  const expiresAt = Date.parse(subscription.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt > now.getTime()
}

export function can(
  user: PlanUser,
  feature: PlanFeature,
  now: Date = new Date(),
): boolean {
  return (
    hasActiveSubscription(user.subscription, now) &&
    plans[user.subscription.plan].features[feature]
  )
}

export function getLimit(
  user: PlanUser,
  resource: PlanResource,
  now: Date = new Date(),
): number | null {
  if (!hasActiveSubscription(user.subscription, now)) return 0
  return plans[user.subscription.plan].limits[resource]
}

export function canCreate(
  user: PlanUser,
  resource: PlanResource,
  now: Date = new Date(),
): boolean {
  const limit = getLimit(user, resource, now)
  return limit === null || user.usage[resource] < limit
}

export function minimumPlanForFeature(feature: PlanFeature): PlanId | null {
  return planIds.find((planId) => plans[planId].features[feature]) ?? null
}

export function minimumPlanForResource(
  resource: PlanResource,
  currentCount: number,
): PlanId | null {
  return (
    planIds.find((planId) => {
      const limit = plans[planId].limits[resource]
      return limit === null || currentCount < limit
    }) ?? null
  )
}

export function requireFeature(user: PlanUser, feature: PlanFeature): void {
  if (can(user, feature)) return
  const requiredPlan =
    minimumPlanForFeature(feature) ??
    (user.subscription?.plan === "plus" ? "pro" : "plus")
  throw new PlanUpgradeRequiredError(
    requiredPlan,
    `Este recurso está disponível no plano ${requiredPlan}.`,
  )
}

export function requirePaidPlan(user: PlanUser): void {
  if (hasPaidSubscription(user.subscription)) return
  throw new PlanUpgradeRequiredError(
    "plus",
    "Este recurso está disponível nos planos pagos.",
  )
}

export function requireCanCreate(user: PlanUser, resource: PlanResource): void {
  if (canCreate(user, resource)) return
  const requiredPlan =
    minimumPlanForResource(resource, user.usage[resource]) ?? "premium"
  throw new PlanUpgradeRequiredError(
    requiredPlan,
    `O limite do plano atual para ${resource} foi atingido.`,
  )
}

export function requireAdditionalCapacity(
  user: PlanUser,
  resource: PlanResource,
  previousCount: number,
  nextCount: number,
): void {
  if (nextCount <= previousCount) return
  const limit = getLimit(user, resource)
  if (limit === null || nextCount <= limit) return
  const requiredPlan =
    minimumPlanForResource(resource, previousCount) ?? "premium"
  throw new PlanUpgradeRequiredError(
    requiredPlan,
    `O limite do plano atual para ${resource} foi atingido.`,
  )
}
