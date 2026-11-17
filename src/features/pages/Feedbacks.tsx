import { useState, type ChangeEvent } from "react"
import type { Feedback } from "../../types/domain"
import { Button, Empty, Notice, Panel, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import { feedbackFields } from "../forms/fields"

export function Feedbacks({
  items,
  search,
  add,
  edit,
  remove,
  toggle,
  canImport,
  onUpgrade,
  importData,
}: {
  items: Feedback[]
  search: string
  add: () => void
  edit: (item: Feedback) => void
  remove: (id: string) => void
  toggle: (id: string) => void
  canImport: boolean
  onUpgrade: () => void
  importData: (file: File) => Promise<void>
}) {
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState("")
  const [importMessage, setImportMessage] = useState("")
  const totalViews = items.reduce((total, item) => total + (item.views ?? 0), 0)
  const totalClicks = items.reduce(
    (total, item) => total + (item.clicks ?? 0),
    0,
  )
  const totalSales = items.reduce((total, item) => total + (item.sales ?? 0), 0)
  const hasResults = items.some(
    (item) =>
      item.views !== undefined ||
      item.clicks !== undefined ||
      item.sales !== undefined,
  )
  const clickRate =
    totalViews > 0
      ? `${((totalClicks / totalViews) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : "—"
  const processImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setImporting(true)
    setImportError("")
    setImportMessage("")
    try {
      await importData(file)
      setImportMessage("Resultados importados com sucesso.")
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o arquivo.",
      )
    } finally {
      setImporting(false)
    }
  }
  const list = items.filter(
    (item) =>
      !search ||
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="07"
        title="Aprenda com o que realmente acontece."
        subtitle="Separe feedback criativo de resultados de venda. Registre evidências, não suposições."
        action={
          <div className="feedback-actions">
            <Button onClick={add}>＋&nbsp; Registrar feedback</Button>
            {canImport ? (
              <label className="button button-secondary import-button">
                {importing ? "Importando..." : "Importar resultados"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => void processImport(event)}
                  disabled={importing}
                />
              </label>
            ) : (
              <button className="button button-secondary" onClick={onUpgrade}>
                🔒 Importar resultados
              </button>
            )}
          </div>
        }
      />
      {importError && (
        <p className="form-error" role="alert">
          {importError}
        </p>
      )}
      {importMessage && (
        <p className="auth-message" role="status">
          {importMessage}
        </p>
      )}
      <Notice>
        Aguardando dados reais. Não há veiculação ou vendas nesta coleção
        demonstrativa.
      </Notice>
      <div className="metric-grid">
        {[
          "Visualizações",
          "Cliques no produto",
          "Vendas atribuídas",
          "Taxa de cliques",
        ].map((label) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>
              {label === "Visualizações"
                ? hasResults
                  ? totalViews.toLocaleString("pt-BR")
                  : "—"
                : label === "Cliques no produto"
                  ? hasResults
                    ? totalClicks.toLocaleString("pt-BR")
                    : "—"
                  : label === "Vendas atribuídas"
                    ? hasResults
                      ? totalSales.toLocaleString("pt-BR")
                      : "—"
                    : clickRate}
            </strong>
            <small>
              {hasResults ? "Resultados importados" : "Aguardando dados reais"}
            </small>
          </div>
        ))}
      </div>
      <Panel>
        <div className="section-head">
          <div>
            <h2>Feedback criativo</h2>
            <p>Comentários internos organizados por campanha.</p>
          </div>
        </div>
        {list.length ? (
          list.map((item) => (
            <article className="feedback-row" key={item.id}>
              <button
                className={`feedback-check ${
                  item.status === "Concluído" ? "done" : ""
                }`}
                onClick={() => toggle(item.id)}
                aria-label={`Marcar ${item.campaign} como ${
                  item.status === "Pendente" ? "concluído" : "pendente"
                }`}
                aria-pressed={item.status === "Concluído"}
              />
              <div>
                <div className="card-top">
                  <strong>{item.campaign}</strong>
                  <Tag
                    tone={item.status === "Concluído" ? "Aprovado" : "Revisão"}
                  >
                    {item.status}
                  </Tag>
                </div>
                {(item.views !== undefined ||
                  item.clicks !== undefined ||
                  item.sales !== undefined) && (
                  <p className="feedback-metrics">
                    {item.views !== undefined &&
                      `${item.views.toLocaleString("pt-BR")} visualizações · `}
                    {item.clicks !== undefined &&
                      `${item.clicks.toLocaleString("pt-BR")} cliques · `}
                    {item.sales !== undefined &&
                      `${item.sales.toLocaleString("pt-BR")} vendas`}
                  </p>
                )}
                <p>“{item.comment}”</p>
                <small>AJUSTE SOLICITADO</small>
                <p>{item.adjustment}</p>
              </div>
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(item)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(item.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Nenhum feedback encontrado"
            text="Altere a busca ou registre um feedback para uma campanha."
          />
        )}
      </Panel>
    </>
  )
}
