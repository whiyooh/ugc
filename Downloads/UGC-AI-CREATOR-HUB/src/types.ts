export type Status = "Ideias" | "Roteiro" | "Produção" | "Revisão" | "Aprovado" | "Publicado"

export type Product = {
  id: string
  name: string
  category: string
  price: string
  platform: string
  benefits: string
  audience: string
  link: string
  image: string
  status: Status
}

export type Creator = {
  id: string
  name: string
  age: string
  style: string
  description: string
  prompt: string
  image: string
}

export type Copy = {
  id: string
  title: string
  type: "Hook" | "Roteiro" | "CTA" | "Legenda"
  product: string
  content: string
  platform: string
}

export type Video = {
  id: string
  title: string
  product: string
  creator: string
  status: Status
  note: string
  image: string
}

export type Reference = {
  id: string
  title: string
  link: string
  note: string
  image: string
}

export type Feedback = {
  id: string
  campaign: string
  comment: string
  adjustment: string
  status: "Pendente" | "Concluído"
}

export type AppData = {
  products: Product[]
  creators: Creator[]
  copies: Copy[]
  videos: Video[]
  references: Reference[]
  feedbacks: Feedback[]
  completedSteps: string[]
}
