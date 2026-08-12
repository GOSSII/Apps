import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { inr } from "@/lib/format";
import { stockRows, stockStatus } from "@/lib/queries";
import { Chip, Header } from "@/components/ui";
import { IconSearch } from "@/components/icons";
import { ExportChips } from "@/components/export-chips";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await currentUser();
  const rows = await stockRows();
  const query = (q ?? "").trim().toLowerCase();
  const filtered = query
    ? rows.filter((r) => r.title.toLowerCase().includes(query) || r.sku.toLowerCase().includes(query))
    : rows;
  const totalPcs = rows.reduce((s, r) => s + r.onHand, 0);

  return (
    <main>
      <Header
        title="Stock"
        sub={<>{totalPcs.toLocaleString("en-IN")} pcs on hand · {rows.length} products · <ExportChips base="/exports/stock" /></>}
        user={user}
      />
      <form className="mb-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
          <IconSearch className="h-4 w-4 text-muted" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, SKU…"
            className="w-full bg-transparent text-[0.82rem] font-semibold outline-none placeholder:text-muted"
          />
        </div>
      </form>

      {filtered.map((r) => {
        const status = stockStatus(r);
        return (
          <Link
            key={r.id}
            href={`/products/${r.id}`}
            className="pressable mb-2.5 flex items-center gap-2.5 rounded-2xl border border-line bg-card p-2.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-lime-wash text-[0.76rem] font-extrabold text-lime-ink">
              {r.sku.slice(0, 2)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.84rem] font-bold">{r.title}</span>
              <span className="flex items-center gap-1 text-[0.66rem] text-muted">
                {r.sku} ·{" "}
                {status === "ok" ? (
                  <Chip tone="ok">In stock</Chip>
                ) : status === "low" ? (
                  <Chip tone="low">Low · reorder at {r.reorderLevel}</Chip>
                ) : (
                  <Chip tone="out">Out of stock</Chip>
                )}
              </span>
            </span>
            <span className="text-right">
              <span className="num block text-[0.95rem] font-extrabold">{r.onHand.toLocaleString("en-IN")}</span>
              <span className="block text-[0.62rem] text-muted">pcs · {r.lastCost ? inr(r.value) : "—"}</span>
            </span>
          </Link>
        );
      })}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nothing matches "{q}".</p>
      ) : null}

      <Link
        href="/purchases/new"
        className="pressable fixed bottom-24 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-forest text-2xl font-bold text-lime shadow-lg shadow-forest/30"
      >
        ＋
      </Link>
    </main>
  );
}
