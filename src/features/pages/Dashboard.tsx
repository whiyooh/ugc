import type { AppData } from "../../types/domain"
import { statusOrder } from "../../data/status"
import { Button, Panel, Tag } from "../../components/ui"
import { PageTitle } from "../../components/layout"
import type { Page } from "../../app/navigation"
import { publicAsset } from "../../utils/assets"

export function Dashboard({
  data,
  go,
  createCampaign,
  toggleStep,
}: {
  data: AppData
  go: (page: Page) => void
  createCampaign: () => void
  toggleStep: (id: string) => void
}) {
  return (
    <>
      <PageTitle
        area="01"
        title="Seu próximo vídeo começa aqui."
        subtitle="Uma visão clara do que criar, produzir e colocar no mundo."
        action={
          <Button onClick={createCampaign}>＋&nbsp; Nova campanha</Button>
        }
      />
      <section className="hero">
        <div>
          <span className="eyebrow">
            CRIAÇÃO COM IA, ORGANIZAÇÃO COM INTENÇÃO
          </span>
          <h2>
            Ideias soltas?
            <br />
            Transforme em conteúdo.
          </h2>
          <p>
            Seu estúdio de UGC para Shopee, TikTok Shop, Kwai e SHEIN. Conecte
            produtos, criadoras, copies e resultados em um só fluxo.
          </p>
          <div className="hero-actions">
            <Button onClick={() => go("template")}>
              Começar pelo template
            </Button>
            <Button variant="secondary" onClick={() => go("videos")}>
              Explorar o Video Lab
            </Button>
          </div>
        </div>
        <img
          src={publicAsset("/assets/b42d7.png")}
          alt="Composição editorial de produtos em tons neutros e lilás"
        />
      </section>
      <div className="platform-grid">
        {["Shopee", "TikTok Shop", "Kwai", "SHEIN"].map((name, index) => (
          <button
            key={name}
            className="platform-card"
            onClick={() => go("products")}
          >
            <span className={`platform-icon platform-${index}`}>
              {index + 1}
            </span>
            <span>
              <strong>{name}</strong>
              <small>
                {data.products.filter((p) => p.platform === name).length}{" "}
                produtos no catálogo
              </small>
            </span>
            <span>↗</span>
          </button>
        ))}
      </div>
      <div className="metric-grid">
        {[
          [
            "products",
            data.products.length,
            "Produtos no catálogo",
            "Variedade para criar",
          ],
          [
            "creators",
            data.creators.length,
            "Criadoras fictícias",
            "Perfis adultos gerados por IA",
          ],
          [
            "videos",
            data.videos.length,
            "Campanhas no fluxo",
            "Uma por etapa de produção",
          ],
          [
            "feedbacks",
            data.videos.filter((v) => v.status === "Publicado").length,
            "Publicação simulada",
            "Ainda sem dados reais",
          ],
        ].map(([target, value, label, detail]) => (
          <button
            className="metric"
            key={label}
            onClick={() => go(target as Page)}
          >
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{detail}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <Panel>
          <div className="section-head">
            <div>
              <h2>Projetos em movimento</h2>
              <p>Campanhas conectadas ao catálogo.</p>
            </div>
            <button className="link-button" onClick={() => go("videos")}>
              Ver todos →
            </button>
          </div>
          <div className="table">
            {data.videos.map((video) => (
              <button
                className="table-row"
                key={video.id}
                onClick={() => go("videos")}
              >
                <span>
                  <strong>{video.title}</strong>
                  <small>{video.product}</small>
                </span>
                <span>{video.creator}</span>
                <Tag tone={video.status}>{video.status}</Tag>
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <div className="section-head">
            <div>
              <h2>Próximos passos</h2>
              <p>Checklist da coleção de exemplo.</p>
            </div>
          </div>
          {data.videos.slice(0, 4).map((video) => (
            <label className="check-row" key={video.id}>
              <input
                type="checkbox"
                checked={data.completedSteps.includes(video.id)}
                onChange={() => toggleStep(video.id)}
              />
              <span>
                <strong>{video.product.split(" · ")[0]}</strong>
                <small>{video.note}</small>
              </span>
            </label>
          ))}
        </Panel>
      </div>
      <Panel>
        <div className="section-head">
          <div>
            <h2>Um fluxo, seis etapas</h2>
            <p>O status de cada campanha é o mesmo em todas as áreas.</p>
          </div>
          <button className="link-button" onClick={() => go("videos")}>
            Abrir Video Lab →
          </button>
        </div>
        <div className="flow">
          {statusOrder.map((status) => (
            <button key={status} onClick={() => go("videos")}>
              <span></span>
              <strong>{status}</strong>
              <small>
                {data.videos.filter((v) => v.status === status).length} campanha
              </small>
            </button>
          ))}
        </div>
      </Panel>
    </>
  )
}
