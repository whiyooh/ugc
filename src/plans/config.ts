import type { CopyType } from "../types/domain.ts"

export const planIds = ["plus", "pro", "premium"] as const

export type PlanId = typeof planIds[number]

export const planFeatures = [
  "dashboard",
  "products",
  "creators",
  "creatorProfileCreation",
  "copyHooksCtas",
  "copyAdvanced",
  "videoKanban",
  "videoStoryboardAi",
  "references",
  "feedbackManual",
  "feedbackImport",
  "drafts",
  "campaignTemplate",
] as const

export type PlanFeature = typeof planFeatures[number]

export const copyFeatureByType: Record<CopyType, PlanFeature> = {
  Hook: "copyHooksCtas",
  CTA: "copyHooksCtas",
  Roteiro: "copyAdvanced",
  Legenda: "copyAdvanced",
  Unboxing: "copyAdvanced",
  "Variação A/B": "copyAdvanced",
}

export function copyFeatureForType(value: string): PlanFeature | null {
  return value in copyFeatureByType
    ? copyFeatureByType[(value as CopyType)]
    : null
}

export const planResources = ["products", "creators"] as const

export type PlanResource = typeof planResources[number]

export const aiActions = [
  "hook",
  "caption",
  "cta",
  "shortScript",
  "storyboard",
  "image",
] as const

export type AiAction = typeof aiActions[number]

export const aiActionCosts: Record<AiAction, number> = {
  hook: 1,
  caption: 1,
  cta: 1,
  shortScript: 2,
  storyboard: 3,
  image: 5,
}

export const trialCreditGrant = 30

type PlanDefinition = {
  name: string
  priceInCents: number
  popular: boolean
  monthlyAiCredits: number
  features: Record<PlanFeature, boolean>
  limits: Record<PlanResource, number | null>
  benefits: readonly string[]
}

const plusFeatures: Record<PlanFeature, boolean> = {
  dashboard: true,
  products: true,
  creators: true,
  creatorProfileCreation: false,
  copyHooksCtas: true,
  copyAdvanced: false,
  videoKanban: true,
  videoStoryboardAi: false,
  references: false,
  feedbackManual: false,
  feedbackImport: false,
  drafts: true,
  campaignTemplate: true,
}

const proFeatures: Record<PlanFeature, boolean> = {
  ...plusFeatures,
  copyAdvanced: true,
  videoStoryboardAi: true,
  references: true,
  feedbackManual: true,
}

const premiumFeatures: Record<PlanFeature, boolean> = {
  ...proFeatures,
  creatorProfileCreation: true,
  feedbackImport: true,
}

export const plans = {
  plus: {
    name: "Plus",
    priceInCents: 1990,
    popular: false,
    monthlyAiCredits: 100,
    features: plusFeatures,
    limits: { products: 5, creators: 2 },
    benefits: [
      "Dashboard completo",
      "Até 5 produtos",
      "Até 2 criadoras IA",
      "Hooks e CTAs na biblioteca de copies",
      "Video Lab com kanban",
      "100 créditos de IA por mês",
    ],
  },
  pro: {
    name: "Pro",
    priceInCents: 3490,
    popular: true,
    monthlyAiCredits: 300,
    features: proFeatures,
    limits: { products: 20, creators: 6 },
    benefits: [
      "Tudo do Plus",
      "Até 20 produtos e 6 criadoras IA",
      "Roteiros, unboxing e variações A/B",
      "Storyboard com prompts de IA",
      "Referências",
      "Registro manual de feedbacks e resultados",
      "300 créditos de IA por mês",
    ],
  },
  premium: {
    name: "Premium",
    priceInCents: 5590,
    popular: false,
    monthlyAiCredits: 800,
    features: premiumFeatures,
    limits: { products: null, creators: null },
    benefits: [
      "Tudo do Pro",
      "Produtos e criadoras ilimitados",
      "Criação ilimitada de perfis de criadora",
      "Importação de dados de resultados",
      "800 créditos de IA por mês",
    ],
  },
} as const satisfies Record<PlanId, PlanDefinition>

export function formatPlanPrice(priceInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceInCents / 100)
}
