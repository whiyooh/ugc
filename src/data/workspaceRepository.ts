import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData, Feedback } from "../types/domain"
import { PlanUpgradeRequiredError } from "../plans/authorization"

type WorkspaceSnapshot = {
  data: AppData
  updatedAt: string | null
}

type WorkspaceResponse = {
  data: unknown
  updatedAt: string | null
}

type SignedImage = {
  path: string
  signedUrl: string | null
}

type SignedImageWithUrl = {
  path: string
  signedUrl: string
}

async function invokeWorkspaceApi<T>(
  client: SupabaseClient,
  body: Record<string, unknown> | FormData,
): Promise<T> {
  const { data, error } = await client.functions.invoke<T>("workspace-api", {
    body,
  })

  if (error) {
    if (error.context instanceof Response) {
      let payload: unknown
      try {
        payload = await error.context.clone().json()
      } catch {
        throw new Error(
          `A função workspace-api respondeu com ${error.context.status}: ${error.message}`,
        )
      }
      if (
        payload &&
        typeof payload === "object" &&
        "code" in payload &&
        payload.code === "PLAN_UPGRADE_REQUIRED" &&
        "requiredPlan" in payload &&
        (payload.requiredPlan === "plus" ||
          payload.requiredPlan === "pro" ||
          payload.requiredPlan === "premium")
      ) {
        const message =
          "message" in payload && typeof payload.message === "string"
            ? payload.message
            : "Seu plano atual não permite esta ação."
        throw new PlanUpgradeRequiredError(payload.requiredPlan, message)
      }
    }
    throw new Error(
      `Não foi possível concluir a operação no servidor: ${error.message}`,
    )
  }

  if (data === null) {
    throw new Error("A função workspace-api não retornou dados.")
  }
  return data
}

export function createEmptyWorkspace(): AppData {
  return {
    products: [],
    creators: [],
    copies: [],
    videos: [],
    references: [],
    feedbacks: [],
    drafts: [],
    completedSteps: [],
  }
}

function arrayOrEmpty<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function stringsOrEmpty(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

export function normalizeWorkspace(value: unknown): AppData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyWorkspace()
  }

  const data = value as Record<string, unknown>
  return {
    products: arrayOrEmpty(data.products),
    creators: arrayOrEmpty(data.creators),
    copies: arrayOrEmpty(data.copies),
    videos: arrayOrEmpty(data.videos),
    references: arrayOrEmpty(data.references),
    feedbacks: arrayOrEmpty(data.feedbacks),
    drafts: arrayOrEmpty(data.drafts),
    completedSteps: stringsOrEmpty(data.completedSteps),
  }
}

export async function loadWorkspace(
  client: SupabaseClient,
): Promise<WorkspaceSnapshot> {
  const response = await invokeWorkspaceApi<WorkspaceResponse>(client, {
    action: "load",
  })
  return {
    data: normalizeWorkspace(response.data),
    updatedAt: response.updatedAt,
  }
}

export async function saveWorkspace(
  client: SupabaseClient,
  workspace: AppData,
): Promise<string> {
  const response = await invokeWorkspaceApi<{ updatedAt: string }>(client, {
    action: "save",
    data: workspace,
  })
  return response.updatedAt
}

export async function uploadWorkspaceImage(
  client: SupabaseClient,
  collection: string,
  file: File,
  isNew: boolean,
): Promise<string> {
  const body = new FormData()
  body.append("action", "upload-image")
  body.append("collection", collection)
  body.append("isNew", String(isNew))
  body.append("file", file)
  const response = await invokeWorkspaceApi<{ path: string }>(client, body)
  return response.path
}

export async function signWorkspaceImages(
  client: SupabaseClient,
  paths: string[],
): Promise<Record<string, string>> {
  const response = await invokeWorkspaceApi<{
    signedImages: SignedImage[]
  }>(client, { action: "sign-images", paths })
  return Object.fromEntries(
    response.signedImages
      .filter(
        (entry): entry is SignedImageWithUrl =>
          typeof entry.path === "string" && typeof entry.signedUrl === "string",
      )
      .map((entry) => [entry.path, entry.signedUrl]),
  )
}

export async function importFeedbacks(
  client: SupabaseClient,
  feedbacks: Feedback[],
): Promise<WorkspaceSnapshot> {
  const response = await invokeWorkspaceApi<WorkspaceResponse>(client, {
    action: "import-feedbacks",
    feedbacks,
  })
  return {
    data: normalizeWorkspace(response.data),
    updatedAt: response.updatedAt,
  }
}
