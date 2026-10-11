import type { Reference } from "../../types/domain"
import { Button, Empty, Notice, Panel, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import { referenceFields } from "../forms/fields"

export function References({
  items,
  search,
  add,
  edit,
  remove,
  resolveImage,
}: {
  items: Reference[]
  search: string
  add: () => void
  edit: (item: Reference) => void
  remove: (id: string) => void
  resolveImage: (image: string) => string
}) {
  const list = items.filter(
    (item) =>
      !search ||
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="06"
        title="Repertório que dá direção."
        subtitle="Reúna prints, referências e estratégias para criar com intenção — sem copiar."
        action={<Button onClick={add}>＋&nbsp; Salvar referência</Button>}
      />
      <Notice>
        Use apenas materiais que você tem autorização para consultar e publicar.
      </Notice>
      {list.length ? (
        <div className="reference-grid">
          {list.map((ref) => (
            <article className="reference-card" key={ref.id}>
              {resolveImage(ref.image) && (
                <img src={resolveImage(ref.image)} alt="" />
              )}
              <Tag tone="purple">REFERÊNCIA</Tag>
              <h2>{ref.title}</h2>
              <h3>O QUE OBSERVAR</h3>
              <p>{ref.note}</p>
              <a href={ref.link} target="_blank" rel="noreferrer">
                {ref.link}
              </a>
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(ref)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(ref.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhuma referência encontrada"
          text="Altere a busca ou salve uma nova referência."
        />
      )}
      <Panel>
        <div className="section-head">
          <div>
            <h2>Links organizados por intenção</h2>
            <p>Seu repertório salvo e disponível para consulta.</p>
          </div>
        </div>
        {list.map((ref) => (
          <div className="simple-row" key={ref.id}>
            <strong>{ref.title}</strong>
            <a href={ref.link} target="_blank" rel="noreferrer">
              {ref.link}
            </a>
          </div>
        ))}
      </Panel>
    </>
  )
}
