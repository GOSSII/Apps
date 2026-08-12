import { db } from "./db";

// Movement direction: IN and RETURN add stock, everything else removes it.
// ADJUST uses the sign convention "quantity removed" for damage-style fixes;
// additions are recorded as RETURN.
const INBOUND = new Set(["IN", "RETURN"]);

export type StockRow = {
  id: string;
  sku: string;
  title: string;
  category: string | null;
  reorderLevel: number;
  onHand: number;
  lastCost: number | null;
  value: number;
};

export async function stockRows(): Promise<StockRow[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    include: {
      movements: { select: { type: true, quantity: true } },
      purchaseLots: { select: { unitCost: true, purchaseDate: true }, orderBy: { purchaseDate: "desc" }, take: 1 },
    },
  });
  return products.map((p) => {
    const onHand = p.movements.reduce(
      (sum, m) => sum + (INBOUND.has(m.type) ? m.quantity : -m.quantity),
      0,
    );
    const lastCost = p.purchaseLots[0] ? Number(p.purchaseLots[0].unitCost) : null;
    return {
      id: p.id,
      sku: p.sku,
      title: p.title,
      category: p.category,
      reorderLevel: p.reorderLevel,
      onHand,
      lastCost,
      // Valuation at latest cost for v1; FIFO valuation arrives with reports.
      value: lastCost ? onHand * lastCost : 0,
    };
  });
}

export function stockStatus(row: { onHand: number; reorderLevel: number }) {
  if (row.onHand <= 0) return "out" as const;
  if (row.onHand <= row.reorderLevel) return "low" as const;
  return "ok" as const;
}

export async function vendorBalances() {
  const vendors = await db.vendor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      purchaseLots: { select: { quantity: true, unitCost: true } },
      payments: { select: { amount: true, paidAt: true, mode: true }, orderBy: { paidAt: "desc" } },
    },
  });
  return vendors.map((v) => {
    const bought = v.purchaseLots.reduce((s, l) => s + l.quantity * Number(l.unitCost), 0);
    const paid = v.payments.reduce((s, p) => s + Number(p.amount), 0);
    return {
      id: v.id,
      name: v.name,
      phone: v.phone,
      bought,
      paid,
      due: bought - paid,
      lastPayment: v.payments[0] ?? null,
    };
  });
}

export async function monthSpend(monthsBack = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
  const lots = await db.purchaseLot.findMany({
    where: { purchaseDate: { gte: start, lt: end } },
    select: { quantity: true, unitCost: true, vendorId: true },
  });
  return lots.reduce((s, l) => s + l.quantity * Number(l.unitCost), 0);
}
