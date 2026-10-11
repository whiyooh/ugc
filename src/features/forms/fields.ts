import type { Field } from "../../components/ui"
import { statusOrder } from "../../data/status"

export const productFields: Field[] = [
  { key: "name", label: "Nome do produto", required: true },
  { key: "image", label: "Imagem do produto", type: "image" },
  { key: "price", label: "Preço (R$)", type: "number", required: true },
  { key: "category", label: "Categoria", required: true },
  {
    key: "platform",
    label: "Plataforma",
    type: "select",
    options: ["Shopee", "TikTok Shop", "Kwai", "SHEIN"],
  },
  { key: "benefits", label: "Benefícios", type: "textarea", required: true },
  { key: "audience", label: "Público-alvo", type: "textarea" },
  { key: "link", label: "Link de venda", type: "url" },
  { key: "status", label: "Status", type: "select", options: statusOrder },
]

export const creatorFields: Field[] = [
  { key: "name", label: "Nome", required: true },
  { key: "image", label: "Retrato da criadora", type: "image" },
  { key: "age", label: "Idade", required: true },
  { key: "style", label: "Estilo", required: true },
  {
    key: "description",
    label: "Descrição e personalidade",
    type: "textarea",
    required: true,
  },
  { key: "prompt", label: "Prompt-base", type: "textarea", required: true },
]

export const copyFields: Field[] = [
  { key: "title", label: "Título / Hook", required: true },
  {
    key: "type",
    label: "Tipo",
    type: "select",
    options: ["Hook", "Roteiro", "CTA", "Legenda"],
  },
  { key: "product", label: "Produto", required: true },
  { key: "platform", label: "Plataforma", required: true },
  { key: "content", label: "Conteúdo", type: "textarea", required: true },
]

export const videoFields: Field[] = [
  { key: "title", label: "Nome da campanha", required: true },
  { key: "image", label: "Imagem da campanha", type: "image" },
  { key: "product", label: "Produto", required: true },
  { key: "creator", label: "Criadora", required: true },
  { key: "status", label: "Etapa", type: "select", options: statusOrder },
  { key: "note", label: "Próxima ação", type: "textarea", required: true },
]

export const referenceFields: Field[] = [
  { key: "title", label: "Título", required: true },
  { key: "image", label: "Imagem de referência", type: "image" },
  { key: "link", label: "Link", type: "url", required: true },
  {
    key: "note",
    label: "Observação estratégica",
    type: "textarea",
    required: true,
  },
]

export const feedbackFields: Field[] = [
  { key: "campaign", label: "Campanha", required: true },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["Pendente", "Concluído"],
  },
  {
    key: "comment",
    label: "Feedback criativo",
    type: "textarea",
    required: true,
  },
  {
    key: "adjustment",
    label: "Ajuste solicitado",
    type: "textarea",
    required: true,
  },
]

export const draftFields: Field[] = [
  { key: "title", label: "Título do rascunho", required: true },
  { key: "content", label: "Conteúdo", type: "textarea", required: true },
]
