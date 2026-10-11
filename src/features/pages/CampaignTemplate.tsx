import type { AppData } from "../../types/domain"
import { Button, Panel, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"

export function Template({
  data,
  duplicate,
  resolveImage,
}: {
  data: AppData
  duplicate: () => void
  resolveImage: (image: string) => string
}) {
  const campaign = data.videos[0]
  const product =
    data.products.find((item) => item.name === campaign?.product) ??
    data.products[0]
  const creator =
    data.creators.find((item) => item.name === campaign?.creator) ??
    data.creators[0]
  const copy =
    data.copies.find((item) => item.product === product?.name) ?? data.copies[0]
  const productImage = product ? resolveImage(product.image) : ""
  const creatorImage = creator ? resolveImage(creator.image) : ""
  const script = [
    copy?.title ?? "Adicione um hook às suas copies.",
    product?.benefits ?? "Adicione benefícios verificáveis ao produto.",
    product?.audience ?? "Descreva o público para orientar as cenas.",
    product?.link
      ? `Confira os detalhes no link: ${product.link}`
      : "Adicione um link de produto antes de publicar.",
  ]
  return (
    <>
      <PageTitle
        area="09"
        title="Uma campanha. Tudo conectado."
        subtitle="Um modelo montado com os registros da sua conta."
        action={<Button onClick={duplicate}>Duplicar campanha</Button>}
      />
      <div className="template-steps">
        <span>
          <strong>01 / DUPLIQUE O FRAME</strong>Mantenha este modelo e renomeie
          a cópia.
        </span>
        <span>
          <strong>02 / PREENCHA O BRIEF</strong>Troque produto, criadora,
          referências e copies.
        </span>
        <span>
          <strong>03 / ACOMPANHE</strong>Atualize o Video Lab e registre
          resultados.
        </span>
      </div>
      <section className="campaign-hero">
        <div>
          <Tag tone="purple">
            {campaign ? campaign.status.toUpperCase() : "NOVA CAMPANHA"}
          </Tag>
          <h2>{campaign?.title ?? "Sua próxima campanha"}</h2>
          <p>
            {campaign?.note ??
              "Crie uma campanha no Video Lab para organizar seu próximo conteúdo."}
          </p>
        </div>
        {productImage && product && (
          <img src={productImage} alt={product.name} />
        )}
      </section>
      <Panel>
        <h2>Briefing do produto</h2>
        {product ? (
          <div className="brief-grid">
            <span>
              <strong>PRODUTO / CATEGORIA</strong>
              {product.name}
              <br />
              {product.category}
            </span>
            <span>
              <strong>PREÇO / PLATAFORMA</strong>R$ {product.price}
              <br />
              {product.platform}
            </span>
            <span>
              <strong>BENEFÍCIOS</strong>
              {product.benefits}
            </span>
          </div>
        ) : (
          <p>Cadastre um produto para preencher este briefing.</p>
        )}
      </Panel>
      <div className="dashboard-columns">
        <Panel>
          <h2>Criadora escolhida</h2>
          {creator ? (
            <div className="creator-mini">
              {creatorImage && <img src={creatorImage} alt={creator.name} />}
              <span>
                <strong>
                  {creator.name} • {creator.age} anos
                </strong>
                {creator.description}
              </span>
            </div>
          ) : (
            <p>Cadastre uma criadora para vinculá-la à campanha.</p>
          )}
        </Panel>
        <Panel>
          <h2>Copy selecionada</h2>
          {copy ? (
            <>
              <blockquote>“{copy.title}”</blockquote>
              <p>{copy.content}</p>
            </>
          ) : (
            <p>Cadastre uma copy para adicionar um roteiro inicial.</p>
          )}
        </Panel>
      </div>
      <Panel>
        <h2>Roteiro • versão A</h2>
        {["Hook", "Demonstração", "Contexto", "CTA"].map((step, index) => (
          <div className="simple-row" key={step}>
            <Tag tone="purple">
              {["0–3 s", "3–9 s", "9–17 s", "17–24 s"][index]} / {step}
            </Tag>
            <span>{script[index]}</span>
          </div>
        ))}
      </Panel>
    </>
  )
}
