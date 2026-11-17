import type { Feedback } from "../types/domain"
import { uid } from "./id"

function parseCsvRows(content: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let values: string[] = []
  let value = ""
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim())
      value = ""
    } else if ((character === "\n" || character === "\r") && !quoted) {
      values.push(value.trim())
      rows.push(values)
      values = []
      value = ""
      if (character === "\r" && content[index + 1] === "\n") index += 1
    } else {
      value += character
    }
  }
  if (quoted) throw new Error("O CSV contém aspas sem fechamento.")
  if (value || values.length) {
    values.push(value.trim())
    rows.push(values)
  }
  return rows
}

function detectDelimiter(header: string): string {
  let commas = 0
  let semicolons = 0
  let quoted = false
  for (let index = 0; index < header.length; index += 1) {
    const character = header[index]
    if (character === '"') {
      quoted = !quoted
    } else if (!quoted && character === ",") {
      commas += 1
    } else if (!quoted && character === ";") {
      semicolons += 1
    }
  }
  return semicolons > commas ? ";" : ","
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function parseCount(
  value: string,
  field: string,
  line: number,
): number | undefined {
  if (!value) return undefined
  const parsed = Number(value.replace(/[.\s]/g, ""))
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(
      `O campo ${field} na linha ${line} deve ser um inteiro positivo.`,
    )
  }
  return parsed
}

export function parseFeedbackCsv(content: string): Feedback[] {
  const normalizedContent = content.replace(/^\uFEFF/, "")
  const header = normalizedContent.split(/\r?\n/, 1)[0] ?? ""
  const rows = parseCsvRows(normalizedContent, detectDelimiter(header)).filter(
    (row) => row.some((value) => value.length > 0),
  )
  if (rows.length < 2) {
    throw new Error("O arquivo precisa ter cabeçalho e pelo menos uma linha.")
  }

  const headers = rows[0].map(normalizeHeader)
  const indexOf = (...names: string[]) =>
    headers.findIndex((column) => names.includes(column))
  const columns = {
    campaign: indexOf("campaign", "campanha"),
    comment: indexOf("comment", "feedback", "comentario"),
    adjustment: indexOf("adjustment", "ajuste"),
    status: indexOf("status"),
    views: indexOf("views", "visualizacoes"),
    clicks: indexOf("clicks", "cliques"),
    sales: indexOf("sales", "vendas"),
  }
  if (columns.campaign < 0) {
    throw new Error("O CSV precisa ter uma coluna campaign ou campanha.")
  }
  if (
    columns.views < 0 &&
    columns.clicks < 0 &&
    columns.sales < 0 &&
    columns.comment < 0
  ) {
    throw new Error(
      "Inclua pelo menos uma coluna de resultados (views, clicks ou sales) ou feedback.",
    )
  }

  return rows.slice(1).map((values, index) => {
    const lineNumber = index + 2
    const cell = (column: number) => (column < 0 ? "" : (values[column] ?? ""))
    const campaign = cell(columns.campaign)
    if (!campaign) {
      throw new Error(`A campanha é obrigatória na linha ${lineNumber}.`)
    }
    const status =
      normalizeHeader(cell(columns.status)) === "concluido"
        ? "Concluído"
        : "Pendente"
    const feedback: Feedback = {
      id: uid(),
      campaign,
      comment: cell(columns.comment),
      adjustment: cell(columns.adjustment),
      status,
    }
    const views = parseCount(cell(columns.views), "views", lineNumber)
    const clicks = parseCount(cell(columns.clicks), "clicks", lineNumber)
    const sales = parseCount(cell(columns.sales), "sales", lineNumber)
    if (views !== undefined) feedback.views = views
    if (clicks !== undefined) feedback.clicks = clicks
    if (sales !== undefined) feedback.sales = sales
    return feedback
  })
}
