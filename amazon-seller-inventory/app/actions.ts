"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, setActor } from "@/lib/db";
import { currentUser } from "@/lib/auth";

async function asActor() {
  const user = await currentUser();
  setActor(user.id);
  return user;
}

export async function actAs(formData: FormData) {
  const id = String(formData.get("userId") ?? "");
  const store = await cookies();
  store.set("acting-user", id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export async function createProduct(formData: FormData) {
  const user = await asActor();
  const title = String(formData.get("title") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const category = String(formData.get("category") ?? "").trim() || null;
  if (!title || !sku) throw new Error("Title and SKU are required");

  const product = await db.product.create({ data: { title, sku, category } });

  // Optional marketplace listing ids entered at creation time.
  for (const mp of ["AMAZON", "FLIPKART", "MEESHO"] as const) {
    const externalId = String(formData.get(`listing_${mp.toLowerCase()}`) ?? "").trim();
    if (externalId) {
      await db.listing.create({
        data: { productId: product.id, marketplace: mp, externalId, createdById: user.id },
      });
    }
  }
  revalidatePath("/stock");
  redirect(`/products/${product.id}`);
}

export async function createPurchase(formData: FormData) {
  const user = await asActor();
  const productId = String(formData.get("productId"));
  const vendorId = String(formData.get("vendorId"));
  const cartons = Math.max(1, Number(formData.get("cartons") ?? 1));
  const unitsPerCarton = Math.max(1, Number(formData.get("unitsPerCarton") ?? 1));
  const unitCost = String(formData.get("unitCost") ?? "0");
  const paidNow = Number(formData.get("paidNow") ?? 0);
  const purchaseDate = formData.get("date") ? new Date(String(formData.get("date"))) : new Date();
  const reorderLevel = Number(formData.get("reorderLevel") ?? 0);
  const quantity = cartons * unitsPerCarton;
  if (!productId || !vendorId || quantity <= 0 || Number(unitCost) <= 0)
    throw new Error("Product, vendor, quantity and cost are required");

  // One transaction: the lot, its IN movement, the optional payment, and the
  // reorder point — a purchase either fully lands or doesn't.
  await db.$transaction(async (tx) => {
    const lot = await tx.purchaseLot.create({
      data: {
        productId, vendorId, quantity, cartons, unitsPerCarton,
        unitCost, purchaseDate, createdById: user.id,
      },
    });
    await tx.stockMovement.create({
      data: { productId, lotId: lot.id, type: "IN", quantity, occurredAt: purchaseDate, createdById: user.id },
    });
    if (paidNow > 0) {
      await tx.vendorPayment.create({
        data: {
          vendorId, lotId: lot.id, amount: String(paidNow), paidAt: purchaseDate,
          mode: "UPI", note: "paid at purchase", createdById: user.id,
        },
      });
    }
    if (reorderLevel > 0) {
      await tx.product.update({ where: { id: productId }, data: { reorderLevel } });
    }
  });
  revalidatePath("/stock");
  revalidatePath("/");
  redirect(`/products/${productId}`);
}

export async function createMovement(formData: FormData) {
  const user = await asActor();
  const productId = String(formData.get("productId"));
  const type = String(formData.get("type")) as "SALE" | "RETURN" | "DAMAGE" | "ADJUST";
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 0));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!productId || !["SALE", "RETURN", "DAMAGE", "ADJUST"].includes(type))
    throw new Error("Invalid movement");
  await db.stockMovement.create({
    data: { productId, type, quantity, note, createdById: user.id },
  });
  revalidatePath("/stock");
  redirect(`/products/${productId}`);
}

export async function createPayment(formData: FormData) {
  const user = await asActor();
  const vendorId = String(formData.get("vendorId"));
  const amount = Number(formData.get("amount") ?? 0);
  const mode = String(formData.get("mode") ?? "UPI") as "CASH" | "UPI" | "BANK" | "OTHER";
  if (!vendorId || amount <= 0) throw new Error("Vendor and amount are required");
  await db.vendorPayment.create({
    data: { vendorId, amount: String(amount), paidAt: new Date(), mode, createdById: user.id },
  });
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/");
  redirect(`/vendors/${vendorId}`);
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite || invite.status !== "PENDING") throw new Error("Invite is not valid");
  if (!name) throw new Error("Name is required");

  setActor(invite.invitedById);
  const user = await db.user.upsert({
    where: { email: invite.email },
    update: { isActive: true, name },
    // authId is a dev placeholder until Supabase OAuth provides the real one.
    create: { authId: `dev-${invite.email}`, email: invite.email, name, role: invite.role, isActive: true },
  });
  await db.invite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });

  const store = await cookies();
  store.set("acting-user", user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/team");
  redirect("/stock");
}

export async function createInvite(formData: FormData) {
  const user = await asActor();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("A valid email is required");
  await db.invite.upsert({
    where: { email },
    update: { status: "PENDING", invitedById: user.id },
    create: { email, invitedById: user.id },
  });
  revalidatePath("/team");
  redirect("/team");
}
