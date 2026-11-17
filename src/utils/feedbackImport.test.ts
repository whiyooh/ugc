import { describe, expect, it } from "vitest"
import { parseFeedbackCsv } from "./feedbackImport"

describe("parseFeedbackCsv", () => {
  it("imports results using English headers and quoted commas", () => {
    const feedbacks = parseFeedbackCsv(
      'campaign,comment,adjustment,views,clicks,sales\nSummer launch,"Strong, clear hook","Use one scene",1200,36,4',
    )
    expect(feedbacks).toHaveLength(1)
    expect(feedbacks[0]).toMatchObject({
      campaign: "Summer launch",
      comment: "Strong, clear hook",
      adjustment: "Use one scene",
      views: 1200,
      clicks: 36,
      sales: 4,
      status: "Pendente",
    })
  })

  it("supports semicolon-delimited Portuguese headers", () => {
    const feedbacks = parseFeedbackCsv(
      "campanha;comentário;visualizações;cliques;vendas\nLançamento;Ótimo;500;20;2",
    )
    expect(feedbacks[0]).toMatchObject({
      campaign: "Lançamento",
      comment: "Ótimo",
      views: 500,
      clicks: 20,
      sales: 2,
    })
  })

  it("preserves line breaks inside quoted fields", () => {
    const feedbacks = parseFeedbackCsv(
      'campaign,comment,views\nLaunch,"First line\nSecond line",50',
    )
    expect(feedbacks[0].comment).toBe("First line\nSecond line")
    expect(feedbacks[0].views).toBe(50)
  })

  it("rejects malformed or incomplete imports explicitly", () => {
    expect(() => parseFeedbackCsv("comment,views\nHi,2")).toThrow(
      "campaign ou campanha",
    )
    expect(() => parseFeedbackCsv("campaign,views\nLaunch,-1")).toThrow(
      "inteiro positivo",
    )
  })
})
