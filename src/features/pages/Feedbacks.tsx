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
}: {
  items: Feedback[]
  search: string
  add: () => void
  edit: (item: Feedback) => void
  remove: (id: string) => void
  toggle: (id: string) => void
}) {
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
        action={<Button onClick={add}>＋&nbsp; Registrar feedback</Button>}
      />
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
            <strong>—</strong>
            <small>Aguardando dados reais</small>
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
