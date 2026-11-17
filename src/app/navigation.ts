import type { AppData } from "../types/domain"
import type { PlanFeature } from "../plans/config"

export type Page = "dashboard" | "products" | "creators" | "copies" | "videos" | "references" | "feedbacks" | "drafts" | "template"

export type Collection = Exclude<keyof AppData, "completedSteps">

export const lockedScreens = [
  "references",
  "feedbacks",
  "template",
] as const satisfies readonly Page[]

export function isLockedScreen(page: Page, hasPaidPlan: boolean): boolean {
  return (
    !hasPaidPlan && lockedScreens.some((lockedScreen) => lockedScreen === page)
  )
}

export const pagePaths: Record<Page, string> = {
  dashboard: "/",
  products: "/produtos",
  creators: "/criadoras",
  copies: "/copies",
  videos: "/video-lab",
  references: "/referencias",
  feedbacks: "/feedbacks",
  drafts: "/rascunhos",
  template: "/template-campanha",
}

export const pageFeatures: Record<Page, PlanFeature> = {
  dashboard: "dashboard",
  products: "products",
  creators: "creators",
  copies: "copyHooksCtas",
  videos: "videoKanban",
  references: "references",
  feedbacks: "feedbackManual",
  drafts: "drafts",
  template: "campaignTemplate",
}

export const icons: Record<Page, string> = {
  dashboard: "/assets/66fc7.svg",
  products: "/assets/ed55a.svg",
  creators: "/assets/35f81.svg",
  copies: "/assets/cc31e.svg",
  videos: "/assets/91039.svg",
  references: "/assets/853de.svg",
  feedbacks: "/assets/5f8f1.svg",
  drafts: "/assets/853de.svg",
  template: "/assets/e4950.svg",
}

export const pageNames: Record<Page, string> = {
  dashboard: "Dashboard",
  products: "Produtos",
  creators: "Banco de criadoras IA",
  copies: "Biblioteca de copies",
  videos: "Video Lab",
  references: "Referências",
  feedbacks: "Feedbacks e resultados",
  drafts: "Rascunhos",
  template: "Template de campanha",
}
