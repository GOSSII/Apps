import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr, relDate } from "@/lib/format";
import { Header } from "@/components/ui";
import { ExportChips } from "@/components/export-chips";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const user = await currentUser();
  const lots = await db.purchaseLot.findMany({
    orderBy: { purchaseDate: "desc" },
    take: 30,
    include: { product: true, vendor: true, createdBy: true, payments: true },
  });

  return (
    <main>
      <Header title="Purchases" sub={<>{lots.length} recent lots · <ExportChips base="/exports/purchases" /></>} user={user} />
      <Link
        href="/purchases/new"
        className="pressable mb-3 block w-full rounded-xl bg-forest py-3 text-center font-heading text-[0.95rem] font-extrabold text-forest-ink shadow-lg shadow-forest/25"
      >
        ＋ Record purchase
      </Link>
      {lots.map((lot) => {
        const total = lot.quantity * Number(lot.unitCost);
        const paid = lot.payments.reduce((s, p) => s + Number(p.amount), 0);
        return (
          <Link
            key={lot.id}
            href={`/products/${lot.productId}`}
            className="pressable mb-2.5 flex items-center justify-between rounded-2xl border border-line bg-card p-3"
          >
            <div>
              <p className="text-[0.8rem] font-bold">
                {lot.quantity.toLocaleString("en-IN")} pcs · {lot.product.title}
              </p>
              <p className="text-[0.66rem] text-muted">
                {relDate(lot.purchaseDate)} · {lot.vendor.name} · @{inr(lot.unitCost)} · by {lot.createdBy.name}
              </p>
            </div>
            <div className="text-right">
              <p className="num text-[0.84rem] font-extrabold">{inr(total)}</p>
              {total - paid > 0.005 ? (
                <p className="num text-[0.64rem] font-bold text-warn">{inr(total - paid)} due</p>
              ) : (
                <p className="text-[0.64rem] font-bold text-ok">Paid</p>
              )}
            </div>
          </Link>
        );
      })}
    </main>
  );
}
