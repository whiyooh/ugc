import type { PlanResource } from "./config"

export function usageForWorkspace(data: {
  products: readonly unknown[]
  creators: readonly unknown[]
}): Readonly<Record<PlanResource, number>> {
  return {
    products: data.products.length,
    creators: data.creators.length,
  }
}
