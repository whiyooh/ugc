import { describe, expect, it } from "vitest"
import {
  PlanUpgradeRequiredError,
  requireFeature,
  type PlanUser,
} from "./authorization"
import type { PlanId } from "./config"
import { assertWorkspaceChangesAllowed } from "./workspaceGuard"

function account(
  plan: PlanId,
  products = 0,
  status: "active" | "trial" = "active",
): PlanUser {
  return {
    subscription: {
      userId: "user-1",
      plan,
      status,
      startedAt: "2026-10-01T00:00:00.000Z",
      expiresAt: null,
    },
    usage: { products, creators: 0 },
  }
}

function expectUpgrade(action: () => void, requiredPlan: PlanId) {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(PlanUpgradeRequiredError)
    expect(error).toMatchObject({
      code: "PLAN_UPGRADE_REQUIRED",
      requiredPlan,
    })
    return
  }
  throw new Error("Expected an upgrade requirement.")
}

function workspace(products: unknown[] = []) {
  return {
    products,
    creators: [],
    copies: [],
    videos: [],
    references: [],
    feedbacks: [],
  }
}

describe("server workspace plan guard", () => {
  it("keeps advanced copies restricted to Pro", () => {
    expectUpgrade(
      () =>
        assertWorkspaceChangesAllowed(account("plus"), workspace(), {
          ...workspace(),
          copies: [{ id: "copy-1", type: "Roteiro" }],
        }),
      "pro",
    )
    expectUpgrade(
      () =>
        assertWorkspaceChangesAllowed(
          account("plus"),
          {
            ...workspace(),
            copies: [{ id: "copy-1", type: "Roteiro", content: "Original" }],
          },
          {
            ...workspace(),
            copies: [{ id: "copy-1", type: "Hook", content: "Alterado" }],
          },
        ),
      "pro",
    )
  })

  it("requires Pro when a Plus user exceeds the product limit", () => {
    const previous = workspace(
      Array.from({ length: 5 }, (_, index) => ({ id: `product-${index}` })),
    )
    const next = workspace([...previous.products, { id: "product-5" }])
    expectUpgrade(
      () => assertWorkspaceChangesAllowed(account("plus", 5), previous, next),
      "pro",
    )
  })

  it("allows Pro features and preserves data after a downgrade", () => {
    expect(() =>
      assertWorkspaceChangesAllowed(account("pro"), workspace(), {
        ...workspace(),
        references: [{ id: "reference-1" }],
        feedbacks: [{ id: "feedback-1" }],
        copies: [{ id: "copy-1", type: "Unboxing" }],
      }),
    ).not.toThrow()

    const overLimit = workspace(
      Array.from({ length: 8 }, (_, index) => ({ id: `product-${index}` })),
    )
    expect(() =>
      assertWorkspaceChangesAllowed(
        account("plus", 8),
        overLimit,
        workspace(overLimit.products),
      ),
    ).not.toThrow()
    expect(() =>
      assertWorkspaceChangesAllowed(
        account("plus", 8),
        overLimit,
        workspace(overLimit.products.slice(1)),
      ),
    ).not.toThrow()
  })

  it("allows locked-screen changes on every paid plan only", () => {
    for (const plan of ["plus", "pro", "premium"] as const) {
      expect(() =>
        assertWorkspaceChangesAllowed(account(plan), workspace(), {
          ...workspace(),
          references: [{ id: "reference-1" }],
          feedbacks: [{ id: "feedback-1" }],
        }),
      ).not.toThrow()
    }

    for (const collection of ["references", "feedbacks"] as const) {
      expectUpgrade(
        () =>
          assertWorkspaceChangesAllowed(
            account("plus", 0, "trial"),
            workspace(),
            {
              ...workspace(),
              [collection]: [{ id: `${collection}-1` }],
            },
          ),
        "plus",
      )
    }

    expectUpgrade(
      () =>
        assertWorkspaceChangesAllowed(
          { subscription: null, usage: { products: 0, creators: 0 } },
          workspace(),
          { ...workspace(), references: [{ id: "reference-1" }] },
        ),
      "plus",
    )
  })

  it("allows Premium-only result imports", () => {
    expect(() =>
      requireFeature(account("premium"), "feedbackImport"),
    ).not.toThrow()
    expectUpgrade(
      () => requireFeature(account("pro"), "feedbackImport"),
      "premium",
    )
  })

  it("allows creator profile edits but restricts creating profiles to Premium", () => {
    const existing = {
      id: "creator-1",
      name: "Lia",
      description: "Descrição original",
    }
    expect(() =>
      assertWorkspaceChangesAllowed(
        account("pro"),
        { ...workspace(), creators: [existing] },
        {
          ...workspace(),
          creators: [{ ...existing, description: "Descrição atualizada" }],
        },
      ),
    ).not.toThrow()

    expectUpgrade(
      () =>
        assertWorkspaceChangesAllowed(account("pro"), workspace(), {
          ...workspace(),
          creators: [{ id: "creator-2", name: "Bia" }],
        }),
      "premium",
    )
    expect(() =>
      assertWorkspaceChangesAllowed(account("premium"), workspace(), {
        ...workspace(),
        creators: [{ id: "creator-2", name: "Bia" }],
      }),
    ).not.toThrow()
  })

  it("allows campaigns without a plan count limit", () => {
    const manyVideos = Array.from({ length: 30 }, (_, index) => ({
      id: `video-${index}`,
    }))
    expect(() =>
      assertWorkspaceChangesAllowed(
        account("plus"),
        { ...workspace(), videos: manyVideos.slice(0, 29) },
        { ...workspace(), videos: manyVideos },
      ),
    ).not.toThrow()
  })
})
