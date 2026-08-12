import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/ui";
import { PurchaseForm } from "@/components/purchase-form";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const user = await currentUser();
  const [products, vendors] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      include: { purchaseLots: { orderBy: { purchaseDate: "desc" }, take: 1, select: { unitsPerCarton: true } } },
    }),
    db.vendor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main>
      <Header title="Record purchase" back="/purchases" user={user} />
      <PurchaseForm
        products={products.map((p) => ({
          id: p.id,
          label: `${p.title} (${p.sku})`,
          // Pcs-per-carton remembers this product's last purchase.
          unitsPerCarton: p.purchaseLots[0]?.unitsPerCarton ?? 1,
          reorderLevel: p.reorderLevel,
        }))}
        vendors={vendors.map((v) => ({ id: v.id, label: v.name }))}
      />
    </main>
  );
}
