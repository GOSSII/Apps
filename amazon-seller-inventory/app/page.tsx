import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { inr, relTime } from "@/lib/format";
import { stockRows, stockStatus, vendorBalances, monthSpend } from "@/lib/queries";
import { Chip, Header, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const user = await currentUser();
  const [rows, vendors, spendNow, spendPrev, latest, recentCount, recentLots] = await Promise.all([
    stockRows(),
    vendorBalances(),
    monthSpend(0),
    monthSpend(1),
    db.auditLog.findFirst({ orderBy: { createdAt: "desc" }, include: { actor: true } }),
    db.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    db.purchaseLot.findMany({
      orderBy: { purchaseDate: "desc" },
      take: 3,
      include: { product: true, vendor: true, createdBy: true, payments: true },
    }),
  ]);

  const stockValue = rows.reduce((s, r) => s + r.value, 0);
  const totalDue = vendors.reduce((s, v) => s + Math.max(0, v.due), 0);
  const owing = vendors.filter((v) => v.due > 0).sort((a, b) => b.due - a.due);
  const low = rows.filter((r) => stockStatus(r) === "low").length;
  const out = rows.filter((r) => stockStatus(r) === "out").length;
  const spendDelta = spendPrev > 0 ? Math.round(((spendNow - spendPrev) / spendPrev) * 100) : null;
  const maxSpend = Math.max(...owing.map((v) => v.bought), 1);

  return (
    <main>
      <Header
        title={`Hello, ${user.name}!`}
        sub="Keep an eye on the money with care."
        user={user}
        bell={recentCount}
      />

      {/* Live banner: the most recent thing anyone did. Realtime push arrives
          with Supabase; until then this renders the latest audit entry. */}
      <Link href="/activity" className="pressable relative mb-3 block overflow-hidden rounded-2xl bg-forest p-3.5 text-forest-ink shadow-lg shadow-forest/30">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(181,224,76,.35),transparent_70%)]" />
        <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-forest-muted">
          ● Live {latest ? `· ${relTime(latest.createdAt)}` : ""}
        </p>
        {latest ? (
          <p className="mt-1 text-[0.95rem] font-bold">
            {latest.actor?.name ?? "System"} · {latest.action.toLowerCase()}{" "}
            <em className="not-italic text-lime">{latest.entity}</em>
          </p>
        ) : (
          <p className="mt-1 text-[0.95rem] font-bold">
            All quiet — entries by your team will appear here <em className="not-italic text-lime">live</em>
          </p>
        )}
        <p className="mt-0.5 text-[0.66rem] font-semibold text-forest-muted">Tap for the full activity log →</p>
      </Link>

      <div className="mb-3 flex gap-2.5">
        <div className="flex-1 rounded-2xl border border-line bg-card p-3">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-muted">Stock value</p>
          <p className="num mt-0.5 text-lg font-extrabold">{inr(stockValue)}</p>
          <p className="text-[0.62rem] font-bold text-muted">at latest cost</p>
        </div>
        <div className="flex-1 rounded-2xl border border-line bg-card p-3">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-muted">Spend · this month</p>
          <p className="num mt-0.5 text-lg font-extrabold">{inr(spendNow)}</p>
          {spendDelta !== null ? (
            <p className={`text-[0.62rem] font-extrabold ${spendDelta >= 0 ? "text-ok" : "text-crit"}`}>
              {spendDelta >= 0 ? "▲" : "▼"} {Math.abs(spendDelta)}% vs last month
            </p>
          ) : (
            <p className="text-[0.62rem] font-bold text-muted">first month on the books</p>
          )}
        </div>
      </div>

      <Panel title={<>Stock health</>}>
        <div className="flex items-center gap-1.5">
          <Chip tone="low">{low} low</Chip>
          <Chip tone="out">{out} out</Chip>
          <Chip tone="ok">{rows.length - low - out} healthy</Chip>
          <Link href="/stock" className="ml-auto text-[0.68rem] font-extrabold text-lime-deep">
            View stock →
          </Link>
        </div>
      </Panel>

      <Panel
        title={
          <>
            Vendor dues — <span className="num text-warn">{inr(totalDue)} to pay</span>
          </>
        }
      >
        {owing.map((v) => (
          <Link key={v.id} href={`/vendors/${v.id}`} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
            <div>
              <p className="text-[0.78rem] font-bold">{v.name}</p>
              <p className="text-[0.66rem] text-muted">
                {v.lastPayment
                  ? `last payment ${relTime(v.lastPayment.paidAt)} · ${v.lastPayment.mode.toLowerCase()}`
                  : "no payments yet"}
              </p>
            </div>
            <p className="num text-[0.84rem] font-extrabold text-warn">{inr(v.due)}</p>
          </Link>
        ))}
        {owing.length === 0 ? <p className="text-[0.74rem] text-muted">Nothing outstanding. 🎉</p> : null}
      </Panel>

      <Panel title={<>Spend by vendor · all time</>}>
        {owing.slice(0, 4).map((v) => (
          <div key={v.id} className="my-1.5 flex items-center gap-2">
            <span className="w-24 truncate text-[0.7rem] text-muted">{v.name.split(" ")[0]}</span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-lime-wash">
              <span
                className="block h-3 rounded-full bg-gradient-to-r from-lime-deep to-lime"
                style={{ width: `${Math.round((v.bought / maxSpend) * 100)}%` }}
              />
            </span>
            <span className="num w-14 text-right text-[0.7rem] font-extrabold">
              {(v.bought / 1000).toFixed(1)}k
            </span>
          </div>
        ))}
      </Panel>

      <Panel title={<>Recent purchases</>}>
        {recentLots.map((lot) => {
          const total = lot.quantity * Number(lot.unitCost);
          const paid = lot.payments.reduce((s, p) => s + Number(p.amount), 0);
          return (
            <Link key={lot.id} href={`/products/${lot.productId}`} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
              <div>
                <p className="text-[0.78rem] font-bold">
                  {lot.quantity.toLocaleString("en-IN")} pcs · {lot.product.title}
                </p>
                <p className="text-[0.66rem] text-muted">
                  {relTime(lot.purchaseDate)} · {lot.vendor.name} · by {lot.createdBy.name}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-[0.82rem] font-extrabold">{inr(total)}</p>
                {total - paid > 0.005 ? (
                  <p className="num text-[0.64rem] font-bold text-warn">{inr(total - paid)} due</p>
                ) : (
                  <p className="text-[0.64rem] font-bold text-ok">Paid</p>
                )}
              </div>
            </Link>
          );
        })}
      </Panel>

      <div className="mb-2 flex gap-2 text-[0.72rem] font-extrabold">
        <Link href="/vendors" className="pressable flex-1 rounded-xl border border-line bg-card py-2.5 text-center">Vendors</Link>
        <Link href="/activity" className="pressable flex-1 rounded-xl border border-line bg-card py-2.5 text-center">Activity</Link>
        <Link href="/team" className="pressable flex-1 rounded-xl border border-line bg-card py-2.5 text-center">Team</Link>
      </div>
    </main>
  );
}
