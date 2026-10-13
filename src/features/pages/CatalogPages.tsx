import { useState } from "react"
import type { Product, Creator } from "../../types/domain"
import { Button, Empty, Notice, Tag, type Field } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import { productFields, creatorFields } from "../forms/fields"
import { formatPrice } from "../../utils/format"

export function Products({
  items,
  search,
  add,
  edit,
  remove,
  resolveImage,
}: {
  items: Product[]
  search: string
  add: () => void
  edit: (item: Product) => void
  remove: (id: string) => void
  resolveImage: (image: string) => string
}) {
  const [platform, setPlatform] = useState("Todos")
  const list = items.filter(
    (item) =>
      (!search ||
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())) &&
      (platform === "Todos" || item.platform === platform),
  )
  return (
    <>
      <PageTitle
        area="02"
        title="Produtos com potencial de história."
        subtitle="Um catálogo organizado para transformar benefícios em cenas de UGC."
        action={<Button onClick={add}>＋&nbsp; Adicionar produto</Button>}
      />
      <Notice>
        Todos os produtos são fictícios. Substitua por informações verificadas
        antes de publicar.
      </Notice>
      <div className="filter-row">
        {[
          "Todos",
          "Shopee",
          "TikTok Shop",
          "Kwai",
          "SHEIN",
          "Mercado Livre",
          "Amazon",
        ].map((item) => (
          <button
            className={platform === item ? "filter-active" : ""}
            onClick={() => setPlatform(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="section-head">
        <div>
          <h2>Catálogo de produtos</h2>
          <p>{list.length} produtos encontrados</p>
        </div>
      </div>
      {list.length ? (
        <div className="product-grid">
          {list.map((product) => (
            <article className="product-card" key={product.id}>
              {resolveImage(product.image) && (
                <img src={resolveImage(product.image)} alt={product.name} />
              )}
              <div className="card-top">
                <Tag>{product.category}</Tag>
                <Tag tone={product.status}>{product.status}</Tag>
              </div>
              <h2>{product.name}</h2>
              <div className="price">R$ {formatPrice(product.price)}</div>
              <dl>
                <dt>BENEFÍCIOS A DEMONSTRAR</dt>
                <dd>{product.benefits}</dd>
                <dt>PÚBLICO-ALVO</dt>
                <dd>{product.audience}</dd>
                <dt>PLATAFORMA</dt>
                <dd>{product.platform}</dd>
              </dl>
              {product.link ? (
                <a
                  className="product-link"
                  href={product.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {product.link}
                </a>
              ) : (
                <span className="product-link">Sem link cadastrado</span>
              )}
              <div className="card-actions">
                <Button variant="secondary" onClick={() => edit(product)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(product.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhum produto encontrado"
          text="Altere a busca ou cadastre um novo produto."
        />
      )}
    </>
  )
}

export function Creators({
  items,
  search,
  copyPrompt,
  add,
  edit,
  remove,
  resolveImage,
}: {
  items: Creator[]
  search: string
  copyPrompt: (prompt: string) => void
  add: () => void
  edit: (item: Creator) => void
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
        area="03"
        title="Uma identidade para cada história."
        subtitle="Galeria de criadoras fictícias adultas, com direção visual e voz consistentes."
        action={<Button onClick={add}>＋&nbsp; Novo perfil</Button>}
      />
      <Notice>
        Todos os perfis são fictícios e os retratos são ilustrativos. Não use
        identidade de pessoas reais sem autorização.
      </Notice>
      <div className="section-head">
        <div>
          <h2>Banco de criadoras IA</h2>
          <p>{list.length} perfis completos</p>
        </div>
      </div>
      {list.length ? (
        <div className="creator-grid">
          {list.map((creator) => (
            <article className="creator-card" key={creator.id}>
              {resolveImage(creator.image) && (
                <img src={resolveImage(creator.image)} alt={creator.name} />
              )}
              <div className="card-top">
                <div>
                  <h2>{creator.name}</h2>
                  <p>{creator.age} anos • Mulher adulta • Perfil fictício</p>
                </div>
                <Tag tone="purple">{creator.style}</Tag>
              </div>
              <h3>PERSONALIDADE</h3>
              <p>{creator.description}</p>
              <div className="prompt">
                <strong>PROMPT-BASE • COPIE PARA CADA CENA</strong>
                {creator.prompt}
              </div>
              <div className="card-actions">
                <Button
                  variant="secondary"
                  onClick={() => copyPrompt(creator.prompt)}
                >
                  Copiar prompt
                </Button>
                <Button variant="secondary" onClick={() => edit(creator)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => remove(creator.id)}>
                  Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhuma criadora encontrada"
          text="Altere a busca ou cadastre um novo perfil."
        />
      )}
    </>
  )
}
