import type { Status, Video } from "../../types/domain"
import { statusOrder } from "../../data/status"
import { Button, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import { videoFields } from "../forms/fields"

export function Videos({
  items,
  search,
  add,
  edit,
  move,
  remove,
  resolveImage,
}: {
  items: Video[]
  search: string
  add: () => void
  edit: (item: Video) => void
  move: (id: string, status: Status) => void
  remove: (id: string) => void
  resolveImage: (image: string) => string
}) {
  const list = items.filter(
    (video) =>
      !search ||
      JSON.stringify(video).toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <>
      <PageTitle
        area="05"
        title="Da ideia ao último take."
        subtitle="Acompanhe o fluxo e transforme o roteiro em um storyboard visual completo."
        action={<Button onClick={add}>＋&nbsp; Novo vídeo</Button>}
      />
      <div className="section-head">
        <div>
          <h2>Quadro de produção</h2>
          <p>
            Uma campanha por etapa. Atualize o status ao editar ou mova pelos
            controles.
          </p>
        </div>
        <Tag tone="purple">Kanban interativo</Tag>
      </div>
      <div className="kanban">
        {statusOrder.map((status) => (
          <section
            className={`kanban-column ${
              status === "Revisão" ? "highlight" : ""
            }`}
            key={status}
          >
            <header>
              <strong>{status}</strong>
              <Tag>{list.filter((v) => v.status === status).length}</Tag>
            </header>
            {list
              .filter((video) => video.status === status)
              .map((video) => {
                const index = statusOrder.indexOf(status)
                return (
                  <article className="kanban-card" key={video.id}>
                    {resolveImage(video.image) && (
                      <img src={resolveImage(video.image)} alt="" />
                    )}
                    <Tag tone="purple">{video.product.split(" · ")[0]}</Tag>
                    <h3>{video.title}</h3>
                    <p>{video.product}</p>
                    <small>{video.creator}</small>
                    <hr />
                    <strong>Próxima ação</strong>
                    <p>{video.note}</p>
                    <div className="kanban-actions">
                      <button
                        disabled={index === 0}
                        onClick={() => move(video.id, statusOrder[index - 1])}
                        aria-label="Mover para etapa anterior"
                      >
                        ←
                      </button>
                      <button onClick={() => edit(video)}>Editar</button>
                      <button
                        disabled={index === statusOrder.length - 1}
                        onClick={() => move(video.id, statusOrder[index + 1])}
                        aria-label="Mover para próxima etapa"
                      >
                        →
                      </button>
                    </div>
                    <button
                      className="remove-link"
                      onClick={() => remove(video.id)}
                    >
                      Excluir
                    </button>
                  </article>
                )
              })}
          </section>
        ))}
      </div>
    </>
  )
}
