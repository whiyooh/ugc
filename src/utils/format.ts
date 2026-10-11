export function formatPrice(price: string) {
  const amount = Number(price.replace(",", "."))
  return Number.isFinite(amount)
    ? amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : price
}
