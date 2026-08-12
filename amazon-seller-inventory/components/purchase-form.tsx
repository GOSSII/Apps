"use client";

import { useMemo, useState } from "react";
import { createPurchase } from "@/app/actions";
import { Field, SaveButton, inputCls } from "./ui";

type Opt = { id: string; label: string; sub?: string; unitsPerCarton?: number; reorderLevel?: number };

const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

// The fifty-times-a-day form. The quantity box does the × as you type; the
// money box reads as a receipt — total, paid now, and what stays due — before
// the save button repeats it all back.
export function PurchaseForm({ products, vendors }: { products: Opt[]; vendors: Opt[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [cartons, setCartons] = useState(1);
  const [upc, setUpc] = useState(products[0]?.unitsPerCarton ?? 1);
  const [cost, setCost] = useState("");
  const [paid, setPaid] = useState("");

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const qty = Math.max(0, cartons) * Math.max(0, upc);
  const total = qty * (Number(cost) || 0);
  const due = Math.max(0, total - (Number(paid) || 0));

  return (
    <form action={createPurchase}>
      <Field label="Product">
        <select
          name="productId"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            const next = products.find((p) => p.id === e.target.value);
            if (next?.unitsPerCarton) setUpc(next.unitsPerCarton);
          }}
          className={inputCls}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Vendor">
        <select name="vendorId" className={inputCls}>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </Field>

      <div className="mb-3 rounded-2xl border border-line bg-card p-3 pb-1.5">
        <p className="mb-1.5 font-heading text-[0.74rem] font-extrabold">Quantity</p>
        <div className="flex gap-2">
          <Field label="Cartons">
            <input name="cartons" type="number" min={1} value={cartons} inputMode="numeric"
              onChange={(e) => setCartons(Number(e.target.value))} className={`${inputCls} num`} />
          </Field>
          <Field label="Pcs / carton">
            <input name="unitsPerCarton" type="number" min={1} value={upc} inputMode="numeric"
              onChange={(e) => setUpc(Number(e.target.value))} className={`${inputCls} num`} />
          </Field>
        </div>
        <p className="flex items-baseline justify-between px-0.5 pb-1 text-[0.72rem] text-muted">
          {cartons} × {upc}
          <span className="num text-[0.92rem] font-extrabold text-ink">= {qty.toLocaleString("en-IN")} pcs</span>
        </p>
      </div>

      <div className="mb-3 rounded-2xl border border-line bg-card p-3 pb-1.5">
        <p className="mb-1.5 font-heading text-[0.74rem] font-extrabold">Money</p>
        <div className="flex gap-2">
          <Field label="Cost per pc">
            <input name="unitCost" required inputMode="decimal" placeholder="₹ 0.00" value={cost}
              onChange={(e) => setCost(e.target.value)} className={`${inputCls} num text-lg`} />
          </Field>
          <Field label="Paid now">
            <input name="paidNow" inputMode="decimal" placeholder="₹ 0" value={paid}
              onChange={(e) => setPaid(e.target.value)} className={`${inputCls} num text-lg`} />
          </Field>
        </div>
        <p className="flex justify-between px-0.5 text-[0.74rem] text-muted">
          Total <span className="num font-bold text-ink">₹{inrFmt.format(total)}</span>
        </p>
        <p className="mt-1 flex justify-between border-t-2 border-ink px-0.5 pb-1 pt-1.5 text-[0.78rem] font-extrabold">
          Stays due <span className="num text-warn">₹{inrFmt.format(due)}</span>
        </p>
      </div>

      <div className="flex gap-2">
        <Field label="Date">
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={`${inputCls} num`} />
        </Field>
        <Field label="Reorder below">
          <input name="reorderLevel" type="number" min={0} inputMode="numeric"
            defaultValue={product?.reorderLevel || ""} placeholder="20" className={`${inputCls} num`} />
        </Field>
      </div>

      <SaveButton>
        Save — <span className="num text-lime">{qty.toLocaleString("en-IN")} pcs · ₹{inrFmt.format(total)}</span>
      </SaveButton>
    </form>
  );
}
