import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData } from "../types/domain"

type WorkspaceSnapshot = {
  data: AppData
  updatedAt: string | null
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
  userId: string,
): Promise<WorkspaceSnapshot> {
  const { data, error } = await client
    .from("user_workspaces")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return {
    data: normalizeWorkspace(data?.data),
    updatedAt: data?.updated_at ?? null,
  }
}

export async function saveWorkspace(
  client: SupabaseClient,
  userId: string,
  workspace: AppData,
): Promise<string> {
  const { data, error } = await client
    .from("user_workspaces")
    .upsert(
      {
        user_id: userId,
        data: workspace,
      },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .single()

  if (error) throw error
  return data.updated_at
}
