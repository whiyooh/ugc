import { useState, type FormEvent, type ReactNode } from "react"

export type IconProps = {
  src: string
  alt?: string
}

export function Icon({ src, alt = "" }: IconProps) {
  return <img className="icon" src={src} alt={alt} />
}

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  onClick?: () => void
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      className={`button button-${variant}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: string
}) {
  return (
    <span
      className={`tag tag-${tone.toLowerCase().replace("ç", "c").replace("ã", "a")}`}
    >
      {children}
    </span>
  )
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`panel ${className}`}>{children}</section>
}

export type EmptyProps = {
  title: string
  text: string
}

export function Empty({ title, text }: EmptyProps) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Icon src="/assets/061b4.svg" />
      {children}
    </div>
  )
}

export type Field = {
  key: string
  label: string
  type?: "text" | "number" | "textarea" | "select" | "url" | "image"
  options?: readonly string[]
  required?: boolean
}

export function FormModal({
  title,
  fields,
  initial,
  onSave,
  onClose,
}: {
  title: string
  fields: Field[]
  initial: Record<string, string>
  onSave: (
    values: Record<string, string>,
    files: Record<string, File>,
  ) => Promise<void>
  onClose: () => void
}) {
  const [values, setValues] = useState(initial)
  const [files, setFiles] = useState<Record<string, File>>({})
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const invalidFile = fields.find((field) => {
      if (field.type !== "image" || !files[field.key]) return false
      const file = files[field.key]
      return (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 10 * 1024 * 1024
      )
    })
    if (invalidFile) {
      setError("Use uma imagem JPEG, PNG ou WebP de até 10 MB.")
      return
    }
    const invalidUrl = fields.find((field) => {
      if (field.type !== "url" || !values[field.key]) return false
      try {
        const url = new URL(values[field.key])
        return url.protocol !== "http:" && url.protocol !== "https:"
      } catch {
        return true
      }
    })
    if (invalidUrl) {
      setError(`${invalidUrl.label} deve começar com http:// ou https://.`)
      return
    }
    setError("")
    setSaving(true)
    try {
      await onSave(values, files)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar. Tente novamente.",
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">UGC AI CREATOR HUB</span>
            <h2>{title}</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <form onSubmit={submit} className="form-grid">
          {fields.map((field) => (
            <label
              key={field.key}
              className={
                field.type === "textarea" ? "field field-wide" : "field"
              }
            >
              <span>{field.label}</span>
              {field.type === "image" ? (
                <>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      setFiles((current) => {
                        const next = { ...current }
                        if (file) next[field.key] = file
                        else delete next[field.key]
                        return next
                      })
                    }}
                  />
                  <small>
                    {files[field.key]?.name ??
                      (values[field.key]
                        ? "A imagem atual será mantida. Selecione outra para substituir."
                        : "JPEG, PNG ou WebP, até 10 MB.")}
                  </small>
                </>
              ) : field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                >
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  required={field.required}
                  min={field.type === "number" ? "0" : undefined}
                  step={field.type === "number" ? "0.01" : undefined}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
