import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Chip, Header } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const user = await currentUser();
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    include: { listings: true, purchaseLots: { select: { id: true } } },
  });

  return (
    <main>
      <Header title="Products" sub={`${products.length} in the catalogue`} user={user} />
      <Link
        href="/products/new"
        className="pressable mb-3 block w-full rounded-xl bg-forest py-3 text-center font-heading text-[0.95rem] font-extrabold text-forest-ink shadow-lg shadow-forest/25"
      >
        ＋ New product
      </Link>
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          className="pressable mb-2.5 flex items-center gap-2.5 rounded-2xl border border-line bg-card p-2.5"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-lime-wash text-[0.76rem] font-extrabold text-lime-ink">
            {p.sku.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.84rem] font-bold">{p.title}</span>
            <span className="block text-[0.66rem] text-muted">
              {p.sku} · {p.category ?? "uncategorised"} · {p.purchaseLots.length} lots
            </span>
          </span>
          <span className="flex flex-wrap justify-end gap-1">
            {p.listings.map((l) => (
              <Chip key={l.id} tone="mp">{l.marketplace.charAt(0) + l.marketplace.slice(1).toLowerCase()}</Chip>
            ))}
          </span>
        </Link>
      ))}
    </main>
  );
}
