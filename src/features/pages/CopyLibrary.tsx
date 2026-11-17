import { useState } from "react"
import { copyTypes, type Copy } from "../../types/domain"
import { Button, Notice, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import { copyFields } from "../forms/fields"
import { copyFeatureByType } from "../../plans/config"

export function Copies({
  items,
  search,
  copyContent,
  canAdvanced,
  onUpgrade,
  add,
  edit,
  remove,
}: {
  items: Copy[]
  search: string
  copyContent: (content: string) => void
  canAdvanced: boolean
  onUpgrade: () => void
  add: () => void
  edit: (item: Copy) => void
  remove: (id: string) => void
}) {
  const [type, setType] = useState("Todos")
  const allowedItems = canAdvanced
    ? items
    : items.filter((item) => copyFeatureByType[item.type] === "copyHooksCtas")
  const list = allowedItems.filter(
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
        {(["Todos", ...copyTypes] as const).map((item) => {
          const locked =
            item !== "Todos" &&
            !canAdvanced &&
            copyFeatureByType[item] === "copyAdvanced"
          return (
            <button
              className={`${type === item ? "filter-active" : ""} ${
                locked ? "filter-locked" : ""
              }`}
              onClick={() => (locked ? onUpgrade() : setType(item))}
              key={item}
              aria-haspopup={locked ? "dialog" : undefined}
              aria-label={
                locked ? `${item}, disponível em plano superior` : item
              }
            >
              {item}
              {locked && <span aria-label="Plano superior"> 🔒</span>}
            </button>
          )
        })}
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
