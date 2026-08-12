import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { relTime } from "@/lib/format";
import { Header } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  CREATE: "added",
  UPDATE: "edited",
  DELETE: "deleted",
  CREATEMANY: "added",
  UPDATEMANY: "edited",
  DELETEMANY: "deleted",
  UPSERT: "saved",
};
const ENTITY_LABEL: Record<string, string> = {
  Product: "a product",
  Vendor: "a vendor",
  PurchaseLot: "a purchase",
  StockMovement: "a stock movement",
  VendorPayment: "a vendor payment",
  SellingPrice: "a selling price",
  Listing: "a listing",
  User: "a user",
};

export default async function ActivityPage() {
  const user = await currentUser();
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: true },
  });

  return (
    <main>
      <Header title="Activity log" back="/" sub="Every change, attributed" user={user} />
      {entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No activity yet — the log fills as the team records purchases, payments and adjustments.
        </p>
      ) : (
        <div className="ml-1.5 border-l-2 border-line pl-4">
          {entries.map((e) => (
            <div key={e.id} className="relative mb-4">
              <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-lime-deep" />
              <p className="text-[0.78rem] font-extrabold">
                {e.actor?.name ?? "System"} · {ACTION_LABEL[e.action] ?? e.action.toLowerCase()}{" "}
                {ENTITY_LABEL[e.entity] ?? e.entity}
              </p>
              <p className="text-[0.62rem] text-muted">{relTime(e.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
