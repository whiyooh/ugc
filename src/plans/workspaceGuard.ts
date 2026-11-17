import { isLockedScreen } from "../app/navigation.ts"
import {
  hasPaidSubscription,
  requireAdditionalCapacity,
  requireFeature,
  requirePaidPlan,
  type PlanUser,
} from "./authorization.ts"
import { copyFeatureForType } from "./config.ts"
import { usageForWorkspace } from "./usage.ts"

export type GuardWorkspace = {
  products: readonly unknown[]
  creators: readonly unknown[]
  copies: readonly unknown[]
  videos: readonly unknown[]
  references: readonly unknown[]
  feedbacks: readonly unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function itemId(value: unknown): string | null {
  return isRecord(value) && typeof value.id === "string" ? value.id : null
}

function serializeStable(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeStable).join(",")}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeStable(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

function collectionChanged(
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean {
  return serializeStable(previous) !== serializeStable(next)
}

function hasAddedEntries(
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean {
  const previousIds = new Set(previous.map(itemId).filter(Boolean))
  return next.some((item) => {
    const id = itemId(item)
    return id === null || !previousIds.has(id)
  })
}

function advancedCopiesChanged(
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean {
  const oldById = new Map(
    previous
      .map((item) => [itemId(item), item] as const)
      .filter(
        (entry): entry is readonly [string, unknown] => entry[0] !== null,
      ),
  )

  return next.some((item) => {
    const id = itemId(item)
    const old = id === null ? undefined : oldById.get(id)
    if (old !== undefined && serializeStable(old) === serializeStable(item)) {
      return false
    }

    const oldType = isRecord(old) ? String(old.type ?? "") : ""
    const nextType = isRecord(item) ? String(item.type ?? "") : ""
    return (
      copyFeatureForType(oldType) !== "copyHooksCtas" ||
      copyFeatureForType(nextType) !== "copyHooksCtas"
    )
  })
}

function storyboardChanged(
  previous: readonly unknown[],
  next: readonly unknown[],
): boolean {
  const oldById = new Map(
    previous
      .map((item) => [itemId(item), item] as const)
      .filter(
        (entry): entry is readonly [string, unknown] => entry[0] !== null,
      ),
  )

  return next.some((item) => {
    if (
      !isRecord(item) ||
      typeof item.storyboard !== "string" ||
      !item.storyboard.trim()
    ) {
      return false
    }
    const id = itemId(item)
    const old = id === null ? undefined : oldById.get(id)
    return !isRecord(old) || old.storyboard !== item.storyboard
  })
}

export function assertWorkspaceChangesAllowed(
  user: PlanUser,
  previous: GuardWorkspace,
  next: GuardWorkspace,
): void {
  const previousUsage = usageForWorkspace(previous)
  const nextUsage = usageForWorkspace(next)

  for (const resource of ["products", "creators"] as const) {
    requireAdditionalCapacity(
      user,
      resource,
      previousUsage[resource],
      nextUsage[resource],
    )
  }

  if (hasAddedEntries(previous.creators, next.creators)) {
    requireFeature(user, "creatorProfileCreation")
  }
  const paidPlanActive = hasPaidSubscription(user.subscription)
  if (
    collectionChanged(previous.references, next.references) &&
    isLockedScreen("references", paidPlanActive)
  ) {
    requirePaidPlan(user)
  }
  if (
    collectionChanged(previous.feedbacks, next.feedbacks) &&
    isLockedScreen("feedbacks", paidPlanActive)
  ) {
    requirePaidPlan(user)
  }
  if (advancedCopiesChanged(previous.copies, next.copies)) {
    requireFeature(user, "copyAdvanced")
  }

  if (storyboardChanged(previous.videos, next.videos)) {
    requireFeature(user, "videoStoryboardAi")
  }
}
