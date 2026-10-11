import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData } from "../types/domain"
import { WORKSPACE_IMAGE_BUCKET } from "../lib/supabase"
import {
  createEmptyWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "./workspaceRepository"
import { publicAsset } from "../utils/assets"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido."
}

function imagePaths(data: AppData, userId: string): string[] {
  const ownedPrefix = `${userId}/`
  const images = [
    ...data.products,
    ...data.creators,
    ...data.videos,
    ...data.references,
  ]
    .map((item) => item.image)
    .filter(
      (image) => typeof image === "string" && image.startsWith(ownedPrefix),
    )

  return [...new Set(images)]
}

export function useSignedWorkspaceImages(
  client: SupabaseClient | null,
  userId: string,
  data: AppData,
) {
  const paths = useMemo(
    () => (client ? imagePaths(data, userId) : []),
    [client, data, userId],
  )
  const pathsKey = JSON.stringify(paths)
  const [signedImages, setSignedImages] = useState<Record<string, string>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setSignedImages({})
    setError("")
    if (!client || paths.length === 0) return

    void client.storage
      .from(WORKSPACE_IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 60)
      .then(({ data: signedUrls, error: signingError }) => {
        if (!active) return
        if (signingError) {
          setError(
            `Não foi possível carregar as imagens privadas: ${signingError.message}`,
          )
          return
        }
        const failedPath = signedUrls?.find((entry) => entry.error)?.path
        if (failedPath) {
          setError("Uma ou mais imagens privadas não puderam ser abertas.")
        }
        setSignedImages(
          Object.fromEntries(
            (signedUrls ?? [])
              .filter((entry) => entry.signedUrl)
              .map((entry) => [entry.path, entry.signedUrl]),
          ),
        )
      })
      .catch((signingError: unknown) => {
        if (active) {
          setError(
            `Não foi possível carregar as imagens privadas: ${errorMessage(signingError)}`,
          )
        }
      })

    return () => {
      active = false
    }
  }, [client, pathsKey, userId])

  const resolveImage = useCallback(
    (image: string) =>
      client && image.startsWith(`${userId}/`)
        ? (signedImages[image] ?? "")
        : publicAsset(image),
    [client, signedImages, userId],
  )

  return { resolveImage, imageError: error }
}

export function useWorkspaceData(
  client: SupabaseClient | null,
  userId: string,
  previewData?: AppData,
) {
  const [data, setData] = useState<AppData>(
    () => previewData ?? createEmptyWorkspace(),
  )
  const [loading, setLoading] = useState(Boolean(client))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveAttempt, setSaveAttempt] = useState(0)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveTimer = useRef<number | null>(null)
  const latestData = useRef(data)

  useEffect(() => {
    latestData.current = data
  }, [data])

  const retryLoad = useCallback(
    () => setLoadAttempt((attempt) => attempt + 1),
    [],
  )
  const retrySave = useCallback(
    () => setSaveAttempt((attempt) => attempt + 1),
    [],
  )

  useEffect(() => {
    let active = true
    if (!client) {
      setData(previewData ?? createEmptyWorkspace())
      setLoading(false)
      setReady(true)
      setLoadError("")
      setLastSavedAt(null)
      return
    }
    setLoading(true)
    setReady(false)
    setLoadError("")
    setData(createEmptyWorkspace())
    setLastSavedAt(null)

    void loadWorkspace(client, userId)
      .then((workspace) => {
        if (!active) return
        setData(workspace.data)
        setLastSavedAt(workspace.updatedAt)
        setReady(true)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setLoadError(
            `Não foi possível carregar seus dados da nuvem: ${errorMessage(loadError)}`,
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [client, loadAttempt, previewData, userId])

  useEffect(() => {
    if (!client || !ready) return
    let active = true
    const snapshot = data
    setSaving(true)
    setError("")

    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      const queuedSave = saveQueue.current.then(() =>
        saveWorkspace(client, userId, snapshot),
      )
      saveQueue.current = queuedSave.then(
        () => undefined,
        () => undefined,
      )

      void queuedSave
        .then((savedAt) => {
          if (!active) return
          setLastSavedAt(savedAt)
          setError("")
          setSaving(false)
        })
        .catch((saveError: unknown) => {
          if (!active) return
          setError(
            `Não foi possível confirmar o salvamento na nuvem: ${errorMessage(saveError)}`,
          )
          setSaving(false)
        })
    }, 500)

    return () => {
      active = false
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
  }, [client, data, ready, saveAttempt, userId])

  const flushSave = useCallback(async () => {
    if (!client) throw new Error("O modo de demonstração não salva dados.")
    if (!ready) throw new Error("Os dados ainda não foram carregados.")
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }

    setSaving(true)
    setError("")
    const queuedSave = saveQueue.current.then(() =>
      saveWorkspace(client, userId, latestData.current),
    )
    saveQueue.current = queuedSave.then(
      () => undefined,
      () => undefined,
    )

    try {
      const savedAt = await queuedSave
      setLastSavedAt(savedAt)
      return savedAt
    } catch (saveError) {
      const message = `Não foi possível confirmar o salvamento na nuvem: ${errorMessage(saveError)}`
      setError(message)
      throw new Error(message)
    } finally {
      setSaving(false)
    }
  }, [client, ready, userId])

  useEffect(() => {
    if (!saving) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [saving])

  return {
    data,
    setData,
    loading,
    saving,
    error,
    loadError,
    lastSavedAt,
    retryLoad,
    retrySave,
    flushSave,
  }
}
