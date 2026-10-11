import { useState } from "react"
import type { Copy } from "../../types/domain"
import { Button, Notice, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import { copyFields } from "../forms/fields"

export function Copies({
  items,
  search,
  copyContent,
  add,
  edit,
  remove,
}: {
  items: Copy[]
  search: string
  copyContent: (content: string) => void
  add: () => void
  edit: (item: Copy) => void
  remove: (id: string) => void
}) {
  const [type, setType] = useState("Todos")
  const list = items.filter(
    (item) =>
      (!search ||
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())) &&
      (type === "Todos" || item.type === type),
  )
  return (
    <>
      <PageTitle
        area="04"
        title="Palavras que viram boas cenas."
        subtitle="Hooks, roteiros e CTAs organizados para adaptar sem começar do zero."
        action={<Button onClick={add}>＋&nbsp; Nova copy</Button>}
      />
      <Notice>
        Copies demonstrativas. Confira benefícios, disponibilidade e regras da
        plataforma antes da veiculação.
      </Notice>
      <div className="filter-row">
        {["Todos", "Hook", "Roteiro", "CTA", "Legenda"].map((item) => (
          <button
            className={type === item ? "filter-active" : ""}
            onClick={() => setType(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="copy-grid">
        {list.map((copy) => (
          <article className="copy-card" key={copy.id}>
            <div className="card-top">
              <Tag tone="purple">{copy.product}</Tag>
              <small>{copy.platform}</small>
            </div>
            <h2>“{copy.title}”</h2>
            <Tag>{copy.type}</Tag>
            <p>{copy.content}</p>
            <div className="card-actions">
              <Button
                variant="secondary"
                onClick={() => copyContent(copy.content)}
              >
                Copiar
              </Button>
              <Button variant="secondary" onClick={() => edit(copy)}>
                Editar
              </Button>
              <Button variant="danger" onClick={() => remove(copy.id)}>
                Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
