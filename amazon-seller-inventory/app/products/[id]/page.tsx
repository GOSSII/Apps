import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inr, relDate } from "@/lib/format";
import { createMovement } from "@/app/actions";
import { Chip, Field, Header, Panel, SaveButton, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";

const INBOUND = new Set(["IN", "RETURN"]);

function CostChart({ lots }: { lots: { unitCost: unknown; purchaseDate: Date }[] }) {
  if (lots.length < 2) return null;
  const pts = lots.map((l) => ({ cost: Number(l.unitCost), date: l.purchaseDate }));
  const min = Math.min(...pts.map((p) => p.cost));
  const max = Math.max(...pts.map((p) => p.cost));
  const pad = (max - min) * 0.15 || max * 0.1;
  const lo = min - pad;
  const hi = max + pad;
  const X = (i: number) => 40 + (i / (pts.length - 1)) * 216;
  const Y = (c: number) => 14 + (1 - (c - lo) / (hi - lo)) * 74;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.cost).toFixed(1)}`).join(" ");
  const area = `${line} L${X(pts.length - 1).toFixed(1)},102 L40,102 Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 272 112" className="w-full" role="img"
      aria-label={`Unit cost history, latest ${inr(last.cost)}`}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b5e04c" stopOpacity=".3" />
          <stop offset="100%" stopColor="#b5e04c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={40} y1={14 + f * 74} x2={256} y2={14 + f * 74} stroke="var(--line)" strokeWidth="1" />
          <text x={34} y={17 + f * 74} fontSize="9" fill="var(--muted)" textAnchor="end">
            {Math.round(hi - f * (hi - lo))}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#cg)" />
      <path d={line} fill="none" stroke="var(--forest-2)" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={X(i)} cy={Y(p.cost)} r={i === pts.length - 1 ? 5 : 3.5}
          fill={i === pts.length - 1 ? "#b5e04c" : "var(--forest-2)"}
          stroke={i === pts.length - 1 ? "var(--forest-2)" : "var(--card)"} strokeWidth="2" />
      ))}
      {pts.map((p, i) => (
        <text key={i} x={X(i)} y={110} fontSize="9" fill="var(--muted)" textAnchor="middle">
          {p.date.toLocaleDateString("en-IN", { month: "short" })}
        </text>
      ))}
    </svg>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const product = await db.product.findUnique({
    where: { id },
    include: {
      listings: { include: { sellingPrices: { orderBy: { effectiveFrom: "desc" }, take: 1 } } },
      purchaseLots: { orderBy: { purchaseDate: "asc" }, include: { vendor: true, createdBy: true } },
      movements: { orderBy: { occurredAt: "desc" }, take: 6, include: { createdBy: true } },
    },
  });
  if (!product) notFound();

  const onHand = product.movements
    ? (await db.stockMovement.findMany({ where: { productId: id }, select: { type: true, quantity: true } })).reduce(
        (s, m) => s + (INBOUND.has(m.type) ? m.quantity : -m.quantity), 0)
    : 0;
  const lots = product.purchaseLots;
  const lastCost = lots.length ? Number(lots[lots.length - 1].unitCost) : null;

  return (
    <main>
      <Header title={product.title} back="/stock" user={user} />
      <div className="mb-3 flex gap-2.5">
        <div className="flex-1 rounded-2xl border border-line bg-card p-3">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-muted">On hand</p>
          <p className="num mt-0.5 text-lg font-extrabold">{onHand.toLocaleString("en-IN")} pcs</p>
        </div>
        <div className="flex-1 rounded-2xl border border-line bg-card p-3">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-wider text-muted">Stock value</p>
          <p className="num mt-0.5 text-lg font-extrabold">{lastCost ? inr(onHand * lastCost) : "—"}</p>
        </div>
      </div>

      {product.listings.length > 0 ? (
        <Panel title="Live on">
          <div className="flex flex-wrap gap-1.5 pb-1">
            {product.listings.map((l) => (
              <Chip key={l.id} tone="mp">
                {l.marketplace.charAt(0) + l.marketplace.slice(1).toLowerCase()}
                {l.sellingPrices[0] ? ` ${inr(l.sellingPrices[0].price)}` : ""}
              </Chip>
            ))}
          </div>
        </Panel>
      ) : null}

      {lots.length >= 2 ? (
        <Panel title="Unit cost over time">
          <CostChart lots={lots} />
        </Panel>
      ) : null}

      <Panel title="Purchase lots">
        {[...lots].reverse().map((lot) => (
          <div key={lot.id} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
            <div>
              <p className="text-[0.78rem] font-bold">
                {lot.quantity.toLocaleString("en-IN")} pcs · {lot.vendor.name}
                {lot.cartons ? (
                  <span className="text-muted"> · {lot.cartons}×{lot.unitsPerCarton}</span>
                ) : null}
              </p>
              <p className="text-[0.66rem] text-muted">
                {relDate(lot.purchaseDate)} · by {lot.createdBy.name}
              </p>
            </div>
            <p className="num text-[0.84rem] font-extrabold">{inr(lot.unitCost)}</p>
          </div>
        ))}
        {lots.length === 0 ? <p className="text-[0.74rem] text-muted">No purchases recorded yet.</p> : null}
      </Panel>

      <Panel title="Recent movements">
        {product.movements.map((m) => (
          <div key={m.id} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
            <div>
              <p className="text-[0.78rem] font-bold">
                {INBOUND.has(m.type) ? "+" : "−"}{m.quantity.toLocaleString("en-IN")} · {m.type.toLowerCase()}
              </p>
              <p className="text-[0.66rem] text-muted">
                {relDate(m.occurredAt)} · by {m.createdBy.name}{m.note ? ` · "${m.note}"` : ""}
              </p>
            </div>
          </div>
        ))}
      </Panel>

      <Panel title="Stock out / adjust">
        <form action={createMovement}>
          <input type="hidden" name="productId" value={product.id} />
          <div className="flex gap-2">
            <Field label="Type">
              <select name="type" className={inputCls}>
                <option value="SALE">Sale</option>
                <option value="DAMAGE">Damage</option>
                <option value="RETURN">Return (in)</option>
                <option value="ADJUST">Adjust (out)</option>
              </select>
            </Field>
            <Field label="Quantity">
              <input name="quantity" type="number" min={1} required inputMode="numeric" className={`${inputCls} num`} />
            </Field>
          </div>
          <Field label="Note · optional">
            <input name="note" placeholder="2 damaged in transit" className={inputCls} />
          </Field>
          <SaveButton>Record movement</SaveButton>
        </form>
      </Panel>
    </main>
  );
}
