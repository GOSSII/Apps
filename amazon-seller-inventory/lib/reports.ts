// Report definitions shared by the Excel and PDF exporters: every report is
// columns + rows + totals, so both formats stay in agreement forever.
import { db } from "./db";
import { stockRows } from "./queries";

export type Col = { key: string; label: string; type?: "num" | "int" | "text"; width?: number };
export type Report = {
  slug: string;
  title: string;
  subtitle: string;
  columns: Col[];
  rows: Record<string, string | number | null>[];
  totals?: Record<string, string | number>;
};

const dateFmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export async function stockReport(): Promise<Report> {
  const rows = await stockRows();
  return {
    slug: "stock",
    title: "Stock report",
    subtitle: `${rows.length} products · as on ${dateFmt(new Date())}`,
    columns: [
      { key: "sku", label: "SKU", width: 10 },
      { key: "title", label: "Product", width: 32 },
      { key: "onHand", label: "On hand (pcs)", type: "int", width: 14 },
      { key: "reorderLevel", label: "Reorder at", type: "int", width: 11 },
      { key: "lastCost", label: "Last cost (₹)", type: "num", width: 13 },
      { key: "value", label: "Value (₹)", type: "num", width: 14 },
    ],
    rows: rows.map((r) => ({ ...r, lastCost: r.lastCost ?? null })),
    totals: {
      title: "Total",
      onHand: rows.reduce((s, r) => s + r.onHand, 0),
      value: rows.reduce((s, r) => s + r.value, 0),
    },
  };
}

export async function purchaseRegister(): Promise<Report> {
  const lots = await db.purchaseLot.findMany({
    orderBy: { purchaseDate: "desc" },
    include: { product: true, vendor: true, createdBy: true, payments: true },
  });
  return {
    slug: "purchases",
    title: "Purchase register",
    subtitle: `${lots.length} lots · all time`,
    columns: [
      { key: "date", label: "Date", width: 12 },
      { key: "product", label: "Product", width: 26 },
      { key: "vendor", label: "Vendor", width: 22 },
      { key: "qty", label: "Qty (pcs)", type: "int", width: 10 },
      { key: "cartons", label: "Cartons", width: 10 },
      { key: "cost", label: "Cost/pc (₹)", type: "num", width: 12 },
      { key: "total", label: "Total (₹)", type: "num", width: 13 },
      { key: "paid", label: "Paid at purchase (₹)", type: "num", width: 18 },
      { key: "by", label: "Entered by", width: 12 },
    ],
    rows: lots.map((l) => ({
      date: dateFmt(l.purchaseDate),
      product: l.product.title,
      vendor: l.vendor.name,
      qty: l.quantity,
      cartons: l.cartons ? `${l.cartons} × ${l.unitsPerCarton}` : "—",
      cost: Number(l.unitCost),
      total: l.quantity * Number(l.unitCost),
      paid: l.payments.reduce((s, p) => s + Number(p.amount), 0),
      by: l.createdBy.name,
    })),
    totals: {
      vendor: "Total",
      qty: lots.reduce((s, l) => s + l.quantity, 0),
      total: lots.reduce((s, l) => s + l.quantity * Number(l.unitCost), 0),
    },
  };
}

export async function vendorStatement(vendorId: string): Promise<Report | null> {
  const vendor = await db.vendor.findUnique({
    where: { id: vendorId },
    include: {
      purchaseLots: { include: { product: true, createdBy: true } },
      payments: { include: { createdBy: true } },
    },
  });
  if (!vendor) return null;
  const entries = [
    ...vendor.purchaseLots.map((l) => ({
      date: l.purchaseDate,
      entry: `Purchase · ${l.quantity.toLocaleString("en-IN")} pcs ${l.product.title}`,
      by: l.createdBy.name,
      debit: l.quantity * Number(l.unitCost),
      credit: null as number | null,
    })),
    ...vendor.payments.map((p) => ({
      date: p.paidAt,
      entry: `Payment · ${p.mode.toLowerCase()}${p.note ? ` · ${p.note}` : ""}`,
      by: p.createdBy.name,
      debit: null as number | null,
      credit: Number(p.amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  const bought = entries.reduce((s, e) => s + (e.debit ?? 0), 0);
  const paid = entries.reduce((s, e) => s + (e.credit ?? 0), 0);
  return {
    slug: `vendor-${vendor.name.toLowerCase().replace(/\s+/g, "-")}`,
    title: `Statement · ${vendor.name}`,
    subtitle: `${vendor.phone ?? ""} ${vendor.gstin ? `· GSTIN ${vendor.gstin}` : ""} · as on ${dateFmt(new Date())}`,
    columns: [
      { key: "date", label: "Date", width: 12 },
      { key: "entry", label: "Entry", width: 38 },
      { key: "by", label: "By", width: 10 },
      { key: "debit", label: "Purchases (₹)", type: "num", width: 14 },
      { key: "credit", label: "Payments (₹)", type: "num", width: 14 },
    ],
    rows: entries.map((e) => ({ ...e, date: dateFmt(e.date) })),
    totals: { entry: "Balance due", by: "", debit: bought, credit: paid, _balance: bought - paid },
  };
}

export async function activityReport(): Promise<Report> {
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { actor: true },
  });
  return {
    slug: "activity",
    title: "Activity log",
    subtitle: `last ${entries.length} entries`,
    columns: [
      { key: "when", label: "When", width: 20 },
      { key: "who", label: "Who", width: 12 },
      { key: "action", label: "Action", width: 12 },
      { key: "entity", label: "Record", width: 18 },
    ],
    rows: entries.map((e) => ({
      when: e.createdAt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }),
      who: e.actor?.name ?? "System",
      action: e.action.toLowerCase(),
      entity: e.entity,
    })),
  };
}
