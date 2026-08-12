import { currentUser } from "@/lib/auth";
import { createProduct } from "@/app/actions";
import { Field, Header, SaveButton, inputCls } from "@/components/ui";
import { IconCamera } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const user = await currentUser();
  return (
    <main>
      <Header title="New product" back="/products" user={user} />
      <form action={createProduct}>
        <div className="mb-3 flex h-[86px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-card text-[0.74rem] font-bold text-muted">
          <IconCamera className="h-5 w-5" />
          Photo upload arrives with Supabase Storage
        </div>
        <Field label="Title">
          <input name="title" required placeholder="Steel Water Bottle 1L" className={inputCls} />
        </Field>
        <Field label="SKU">
          <input name="sku" required placeholder="SB-1L" className={`${inputCls} num uppercase`} />
        </Field>
        <Field label="Category">
          <input name="category" placeholder="Home & Kitchen" className={inputCls} />
        </Field>
        <p className="mb-1 mt-4 text-[0.62rem] font-extrabold uppercase tracking-wider text-muted">
          Marketplace listings · optional
        </p>
        <Field label="Amazon ASIN">
          <input name="listing_amazon" placeholder="B0C4…" className={`${inputCls} num`} />
        </Field>
        <Field label="Flipkart FSN">
          <input name="listing_flipkart" placeholder="FSN…" className={`${inputCls} num`} />
        </Field>
        <Field label="Meesho ID">
          <input name="listing_meesho" placeholder="MSH…" className={`${inputCls} num`} />
        </Field>
        <SaveButton>Save product</SaveButton>
      </form>
    </main>
  );
}
