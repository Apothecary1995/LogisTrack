export function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: fractionDigits,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("tr-TR");
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("tr-TR");
}
