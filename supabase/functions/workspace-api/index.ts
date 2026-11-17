import { createClient } from "npm:@supabase/supabase-js@2"
import {
  hasPaidSubscription,
  requireCanCreate,
  requireFeature,
  requirePaidPlan,
  PlanUpgradeRequiredError,
  type PlanUser,
  type UserSubscription,
} from "../../../src/plans/authorization.ts"
import {
  planIds,
  type PlanId,
  type PlanResource,
} from "../../../src/plans/config.ts"
import { usageForWorkspace } from "../../../src/plans/usage.ts"
import { assertWorkspaceChangesAllowed } from "../../../src/plans/workspaceGuard.ts"
import { isLockedScreen } from "../../../src/app/navigation.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const bucketName = "workspace-images"
const resourceCollections = {
  products: "products",
  creators: "creators",
} as const satisfies Record<string, PlanResource>

type Workspace = {
  products: Record<string, unknown>[]
  creators: Record<string, unknown>[]
  copies: Record<string, unknown>[]
  videos: Record<string, unknown>[]
  references: Record<string, unknown>[]
  feedbacks: Record<string, unknown>[]
  drafts: Record<string, unknown>[]
  completedSteps: string[]
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isValidImportedFeedback(
  value: unknown,
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  if (
    typeof value.id !== "string" ||
    typeof value.campaign !== "string" ||
    typeof value.comment !== "string" ||
    typeof value.adjustment !== "string" ||
    (value.status !== "Pendente" && value.status !== "Concluído")
  ) {
    return false
  }
  return ["views", "clicks", "sales"].every((key) => {
    const count = value[key]
    return (
      count === undefined ||
      (typeof count === "number" && Number.isSafeInteger(count) && count >= 0)
    )
  })
}

function normalizeWorkspace(value: unknown): Workspace {
  const data = isRecord(value) ? value : {}
  const list = (key: keyof Omit<Workspace, "completedSteps">) =>
    Array.isArray(data[key]) ? (data[key] as unknown[]).filter(isRecord) : []

  return {
    products: list("products"),
    creators: list("creators"),
    copies: list("copies"),
    videos: list("videos"),
    references: list("references"),
    feedbacks: list("feedbacks"),
    drafts: list("drafts"),
    completedSteps: Array.isArray(data.completedSteps)
      ? data.completedSteps.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  }
}

function mapSubscription(
  value: unknown,
  userId: string,
): UserSubscription | null {
  if (!isRecord(value)) return null
  const plan = planIds.find((candidate) => candidate === value.plan)
  const status = ([
    "trial",
    "active",
    "pending",
    "past_due",
    "expired",
    "canceled",
  ] as const).find((candidate) => candidate === value.status)
  const startedAt = value.started_at
  const expiresAt = value.expires_at
  if (
    !plan ||
    !status ||
    typeof startedAt !== "string" ||
    (expiresAt !== null && typeof expiresAt !== "string")
  ) {
    throw new Error("A assinatura armazenada tem dados inválidos.")
  }

  return {
    userId,
    plan,
    status,
    startedAt,
    expiresAt,
  }
}

function planUser(
  subscription: UserSubscription | null,
  workspace: Workspace,
): PlanUser {
  return { subscription, usage: usageForWorkspace(workspace) }
}

function getSubscription(
  value: unknown,
  userId: string,
): UserSubscription | null {
  return mapSubscription(value, userId)
}

function getResourceForCollection(
  collection: string,
): PlanResource | undefined {
  return resourceCollections[(collection as keyof typeof resourceCollections)]
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (request.method !== "POST") {
    return jsonResponse({ code: "METHOD_NOT_ALLOWED" }, 405)
  }

  const authorization = request.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ code: "UNAUTHORIZED" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Configuração da função workspace-api está incompleta.")
    return jsonResponse({ code: "SERVER_CONFIGURATION_ERROR" }, 500)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()
  if (authError || !user) {
    return jsonResponse({ code: "UNAUTHORIZED" }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data: subscriptionRow, error: subscriptionError } = await admin
      .from("user_subscriptions")
      .select("plan, status, started_at, expires_at")
      .eq("user_id", user.id)
      .maybeSingle()
    if (subscriptionError) throw subscriptionError
    const subscription = getSubscription(subscriptionRow, user.id)

    const { data: workspaceRow, error: workspaceError } = await admin
      .from("user_workspaces")
      .select("data, updated_at")
      .eq("user_id", user.id)
      .maybeSingle()
    if (workspaceError) throw workspaceError
    const currentWorkspace = normalizeWorkspace(workspaceRow?.data)
    const currentUser = planUser(subscription, currentWorkspace)

    const contentType = request.headers.get("content-type") ?? ""
    const isForm = contentType.includes("multipart/form-data")
    const body = isForm ? await request.formData() : await request.json()
    const action = isForm
      ? String(body.get("action") ?? "")
      : isRecord(body)
        ? String(body.action ?? "")
        : ""

    if (action === "load") {
      const hasPaidPlan = hasPaidSubscription(subscription)
      const visibleWorkspace = { ...currentWorkspace }
      if (isLockedScreen("references", hasPaidPlan)) {
        visibleWorkspace.references = []
      }
      if (isLockedScreen("feedbacks", hasPaidPlan)) {
        visibleWorkspace.feedbacks = []
      }
      return jsonResponse({
        data: visibleWorkspace,
        updatedAt: workspaceRow?.updated_at ?? null,
      })
    }

    if (action === "save") {
      if (!isRecord(body) || !isRecord(body.data)) {
        return jsonResponse({ code: "INVALID_REQUEST" }, 400)
      }
      const submittedWorkspace = normalizeWorkspace(body.data)
      const nextWorkspace = { ...submittedWorkspace }
      if (isLockedScreen("references", hasPaidSubscription(subscription))) {
        nextWorkspace.references = currentWorkspace.references
      }
      if (isLockedScreen("feedbacks", hasPaidSubscription(subscription))) {
        nextWorkspace.feedbacks = currentWorkspace.feedbacks
      }
      assertWorkspaceChangesAllowed(
        currentUser,
        currentWorkspace,
        nextWorkspace,
      )
      const { data: savedRow, error: saveError } = await admin
        .from("user_workspaces")
        .upsert({ user_id: user.id, data: nextWorkspace }, {
          onConflict: "user_id",
        })
        .select("updated_at")
        .single()
      if (saveError) throw saveError
      return jsonResponse({ updatedAt: savedRow.updated_at })
    }

    if (action === "upload-image") {
      if (!isForm) return jsonResponse({ code: "INVALID_REQUEST" }, 400)
      const collection = String(body.get("collection") ?? "")
      if (
        !["products", "creators", "videos", "references"].includes(collection)
      ) {
        return jsonResponse({ code: "INVALID_COLLECTION" }, 400)
      }
      const file = body.get("file")
      if (!(file instanceof File) || file.size > 10 * 1024 * 1024) {
        return jsonResponse({ code: "INVALID_IMAGE" }, 400)
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return jsonResponse({ code: "INVALID_IMAGE" }, 400)
      }
      if (
        collection === "references" &&
        isLockedScreen("references", hasPaidSubscription(subscription))
      ) {
        requirePaidPlan(currentUser)
      }
      if (collection === "creators" && body.get("isNew") === "true") {
        requireFeature(currentUser, "creatorProfileCreation")
      }
      const resource = getResourceForCollection(collection)
      if (resource && body.get("isNew") === "true") {
        requireCanCreate(currentUser, resource)
      }

      const safeName =
        file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "image"
      const imagePath = `${user.id}/${collection}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(imagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        })
      if (uploadError) throw uploadError
      return jsonResponse({ path: imagePath })
    }

    if (action === "sign-images") {
      if (!isRecord(body) || !Array.isArray(body.paths)) {
        return jsonResponse({ code: "INVALID_REQUEST" }, 400)
      }
      const paths = body.paths.filter(
        (path): path is string =>
          typeof path === "string" && path.startsWith(`${user.id}/`),
      )
      if (paths.length !== body.paths.length) {
        return jsonResponse({ code: "INVALID_IMAGE_PATH" }, 403)
      }
      if (
        paths.some((path) => path.startsWith(`${user.id}/references/`)) &&
        isLockedScreen("references", hasPaidSubscription(subscription))
      ) {
        requirePaidPlan(currentUser)
      }
      const { data: signedImages, error: signingError } = await admin.storage
        .from(bucketName)
        .createSignedUrls(paths, 60 * 60)
      if (signingError) throw signingError
      return jsonResponse({ signedImages })
    }

    if (action === "import-feedbacks") {
      if (!isRecord(body) || !Array.isArray(body.feedbacks)) {
        return jsonResponse({ code: "INVALID_REQUEST" }, 400)
      }
      requireFeature(currentUser, "feedbackImport")
      const imported = body.feedbacks.filter(isValidImportedFeedback)
      if (imported.length !== body.feedbacks.length) {
        return jsonResponse({ code: "INVALID_FEEDBACK_DATA" }, 400)
      }
      const nextWorkspace = {
        ...currentWorkspace,
        feedbacks: [...currentWorkspace.feedbacks, ...imported],
      }
      const { data: savedRow, error: saveError } = await admin
        .from("user_workspaces")
        .upsert({ user_id: user.id, data: nextWorkspace }, {
          onConflict: "user_id",
        })
        .select("updated_at")
        .single()
      if (saveError) throw saveError
      return jsonResponse({
        data: nextWorkspace,
        updatedAt: savedRow.updated_at,
      })
    }

    return jsonResponse({ code: "UNKNOWN_ACTION" }, 400)
  } catch (error) {
    if (error instanceof PlanUpgradeRequiredError) {
      return jsonResponse(
        {
          code: error.code,
          requiredPlan: error.requiredPlan,
          message: error.message,
        },
        403,
      )
    }
    console.error("Falha na função workspace-api.", error)
    return jsonResponse({ code: "WORKSPACE_REQUEST_FAILED" }, 500)
  }
})
