// Indian-format rupees: ₹4,21,300 — lakh/crore grouping, no decimals unless
// the amount has paise.
const inrWhole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function inr(value: number | string | { toNumber(): number }) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : value.toNumber();
  const fmt = Number.isInteger(n) ? inrWhole : inrPaise;
  return `₹${fmt.format(n)}`;
}

export function relDate(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function relTime(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${relDate(d)}, ${time}`;
}
