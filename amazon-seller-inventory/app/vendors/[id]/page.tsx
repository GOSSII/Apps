import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr, relDate } from "@/lib/format";
import { createPayment } from "@/app/actions";
import { Field, Header, Panel, SaveButton, inputCls } from "@/components/ui";
import { ExportChips } from "@/components/export-chips";

export const dynamic = "force-dynamic";

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const vendor = await db.vendor.findUnique({
    where: { id },
    include: {
      purchaseLots: { include: { product: true, payments: true, createdBy: true }, orderBy: { purchaseDate: "desc" } },
      payments: { include: { createdBy: true }, orderBy: { paidAt: "desc" } },
    },
  });
  if (!vendor) notFound();

  const bought = vendor.purchaseLots.reduce((s, l) => s + l.quantity * Number(l.unitCost), 0);
  const paid = vendor.payments.reduce((s, p) => s + Number(p.amount), 0);
  const due = bought - paid;

  // Per-product totals from this vendor.
  const byProduct = new Map<string, { title: string; qty: number; total: number; lots: number }>();
  for (const l of vendor.purchaseLots) {
    const e = byProduct.get(l.productId) ?? { title: l.product.title, qty: 0, total: 0, lots: 0 };
    e.qty += l.quantity;
    e.total += l.quantity * Number(l.unitCost);
    e.lots += 1;
    byProduct.set(l.productId, e);
  }

  // The khata: purchases and payments interleaved, newest first.
  const ledger = [
    ...vendor.purchaseLots.map((l) => ({
      kind: "purchase" as const,
      date: l.purchaseDate,
      label: `Purchase · ${l.quantity.toLocaleString("en-IN")} pcs ${l.product.title}`,
      sub: `${relDate(l.purchaseDate)} · by ${l.createdBy.name}`,
      amount: l.quantity * Number(l.unitCost),
    })),
    ...vendor.payments.map((p) => ({
      kind: "payment" as const,
      date: p.paidAt,
      label: `Payment · ${p.mode.toLowerCase()}`,
      sub: `${relDate(p.paidAt)} · by ${p.createdBy.name}${p.note ? ` · ${p.note}` : ""}`,
      amount: Number(p.amount),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <main>
      <Header title={vendor.name} back="/vendors" sub={vendor.phone ?? undefined} user={user} />
      <div className="mb-3 flex gap-2.5">
        <div className="flex-1 rounded-2xl border border-line bg-card p-3">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-muted">Bought · all time</p>
          <p className="num mt-0.5 text-lg font-extrabold">{inr(bought)}</p>
        </div>
        <div className="flex-1 rounded-2xl bg-forest p-3 text-forest-ink">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-forest-muted">Balance due</p>
          <p className="num mt-0.5 text-lg font-extrabold text-lime">{inr(Math.max(0, due))}</p>
        </div>
      </div>

      <Panel title="Products from this vendor">
        {[...byProduct.values()].map((p) => (
          <div key={p.title} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
            <div>
              <p className="text-[0.78rem] font-bold">{p.title}</p>
              <p className="text-[0.66rem] text-muted">
                {p.qty.toLocaleString("en-IN")} pcs · {p.lots} lots · avg {inr(p.total / p.qty)}
              </p>
            </div>
            <p className="num text-[0.82rem] font-extrabold">{inr(p.total)}</p>
          </div>
        ))}
      </Panel>

      <Panel title={<>Ledger · purchases and payments <ExportChips base={`/exports/vendor?id=${vendor.id}`} /></>}>
        {ledger.slice(0, 8).map((e, i) => (
          <div key={i} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
            <div>
              <p className={`text-[0.76rem] font-bold ${e.kind === "payment" ? "text-ok" : ""}`}>{e.label}</p>
              <p className="text-[0.64rem] text-muted">{e.sub}</p>
            </div>
            <p className={`num flex-none text-[0.8rem] font-extrabold ${e.kind === "payment" ? "text-ok" : ""}`}>
              {e.kind === "payment" ? "− " : "+ "}
              {inr(e.amount)}
            </p>
          </div>
        ))}
        <p className="mt-1 flex justify-between border-t-2 border-ink pt-2 text-[0.82rem] font-extrabold">
          Balance due <span className="num text-warn">{inr(Math.max(0, due))}</span>
        </p>
      </Panel>

      <Panel title="Record payment">
        <form action={createPayment}>
          <input type="hidden" name="vendorId" value={vendor.id} />
          <div className="flex gap-2">
            <Field label="Amount">
              <input name="amount" required inputMode="decimal" placeholder="₹ 0" className={`${inputCls} num text-lg`} />
            </Field>
            <Field label="Mode">
              <select name="mode" className={inputCls}>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>
          <SaveButton>Record payment</SaveButton>
        </form>
      </Panel>
    </main>
  );
}
