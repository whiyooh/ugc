import type { Draft } from "../../types/domain"
import { Button, Empty } from "../../components/ui"
import { PageTitle } from "../../components/layout"

export function Drafts({
  items,
  search,
  add,
  edit,
  remove,
}: {
  items: Draft[]
  search: string
  add: () => void
  edit: (item: Draft) => void
  remove: (id: string) => void
}) {
  const query = search.trim().toLowerCase()
  const list = items.filter(
    (item) =>
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query),
  )

  return (
    <>
      <PageTitle
        area="08"
        title="Guarde uma ideia para depois."
        subtitle="Rascunhos privados que ficam disponíveis quando você voltar."
        action={<Button onClick={add}>＋&nbsp; Novo rascunho</Button>}
      />
      {list.length ? (
        <div className="draft-grid">
          {list.map((draft) => (
            <article className="draft-card" key={draft.id}>
              <h2>{draft.title}</h2>
              <p>{draft.content}</p>
              <small>
                Atualizado em{" "}
                {new Date(draft.updatedAt).toLocaleString("pt-BR")}
              </small>
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(draft)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(draft.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            query ? "Nenhum rascunho encontrado" : "Ainda não há rascunhos"
          }
          text={
            query
              ? "Altere a busca ou crie um novo rascunho."
              : "Crie um rascunho para guardar ideias, roteiros ou notas de campanha."
          }
        />
      )}
    </>
  )
}
