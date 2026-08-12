// Demo seed: one owner, two staff, three vendors, five products with lots,
// movements, partial payments and listings — enough history that every screen
// has something true to show. Run: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const day = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.pushSubscription.deleteMany(),
    db.invite.deleteMany(),
    db.sellingPrice.deleteMany(),
    db.listing.deleteMany(),
    db.vendorPayment.deleteMany(),
    db.stockMovement.deleteMany(),
    db.purchaseLot.deleteMany(),
    db.product.deleteMany(),
    db.vendor.deleteMany(),
    db.user.deleteMany(),
  ]);

  const [owner, ravi, priya] = await Promise.all([
    db.user.create({ data: { authId: "dev-owner", email: "dipsgos7@gmail.com", name: "Dipesh", role: "ADMIN", isActive: true } }),
    db.user.create({ data: { authId: "dev-ravi", email: "ravi.stock@gmail.com", name: "Ravi", role: "STAFF", isActive: true } }),
    db.user.create({ data: { authId: "dev-priya", email: "priya.stock@gmail.com", name: "Priya", role: "STAFF", isActive: true } }),
  ]);

  await db.invite.create({
    data: { email: "sunil.k@gmail.com", invitedById: owner.id, createdAt: day(1) },
  });

  const [mahavir, ganesh, balaji] = await Promise.all([
    db.vendor.create({ data: { name: "Mahavir Traders", phone: "+91 98200 11223", gstin: "27AAACM1234A1Z5", address: "Sadar Bazar, Delhi" } }),
    db.vendor.create({ data: { name: "Shree Ganesh Enterprises", phone: "+91 99300 44556", gstin: "27AABCS5678B1Z2", address: "Crawford Market, Mumbai" } }),
    db.vendor.create({ data: { name: "Balaji Enterprises", phone: "+91 90040 77889", address: "Chickpet, Bengaluru" } }),
  ]);

  const products = {};
  for (const p of [
    { key: "sb", sku: "SB-1L", title: "Steel Water Bottle 1L", category: "Home & Kitchen", reorderLevel: 30 },
    { key: "ym", sku: "YM-6B", title: "Yoga Mat 6mm Blue", category: "Sports", reorderLevel: 20 },
    { key: "ct", sku: "CT-300", title: "Copper Tumbler 300ml", category: "Home & Kitchen", reorderLevel: 25 },
    { key: "jbl", sku: "JB-L", title: "Jute Bag Large", category: "Bags", reorderLevel: 15 },
    { key: "jbs", sku: "JB-S", title: "Jute Bag Small", category: "Bags", reorderLevel: 15 },
  ]) {
    const { key, ...data } = p;
    products[key] = await db.product.create({ data });
  }

  const listing = (productKey, marketplace, externalId, price, daysAgo) =>
    db.listing
      .create({ data: { productId: products[productKey].id, marketplace, externalId, createdById: owner.id } })
      .then((l) => db.sellingPrice.create({ data: { listingId: l.id, price, effectiveFrom: day(daysAgo), createdById: owner.id } }));
  await listing("sb", "AMAZON", "B0C4STLBTL", "249", 40);
  await listing("sb", "FLIPKART", "FSNSTLBTL1", "259", 35);
  await listing("sb", "MEESHO", "MSH99201", "239", 30);
  await listing("ym", "AMAZON", "B0C4YGMT6B", "449", 25);
  await listing("ct", "MEESHO", "MSH88112", "199", 20);

  // Purchase lots — the June ₹100 → July ₹80 story on the steel bottle.
  const lots = [
    { p: "sb", v: balaji, qty: 80, cartons: 4, upc: 20, cost: "100.00", d: 64, by: priya, paid: "8000" },
    { p: "sb", v: mahavir, qty: 60, cartons: 3, upc: 20, cost: "80.00", d: 29, by: ravi, paid: "3000" },
    { p: "sb", v: mahavir, qty: 1000, cartons: 10, upc: 100, cost: "82.50", d: 0, by: ravi, paid: "50000" },
    { p: "ym", v: ganesh, qty: 40, cartons: 2, upc: 20, cost: "180.00", d: 20, by: ravi, paid: "7200" },
    { p: "ct", v: mahavir, qty: 200, cartons: 4, upc: 50, cost: "64.00", d: 12, by: priya, paid: "8000" },
    { p: "ct", v: balaji, qty: 100, cartons: 2, upc: 50, cost: "68.00", d: 40, by: priya, paid: "6800" },
    { p: "jbl", v: ganesh, qty: 50, cartons: 1, upc: 50, cost: "35.00", d: 33, by: ravi, paid: "1750" },
    { p: "jbs", v: ganesh, qty: 80, cartons: 1, upc: 80, cost: "22.00", d: 33, by: ravi, paid: "0" },
  ];
  for (const l of lots) {
    const lot = await db.purchaseLot.create({
      data: {
        productId: products[l.p].id,
        vendorId: l.v.id,
        quantity: l.qty,
        cartons: l.cartons,
        unitsPerCarton: l.upc,
        unitCost: l.cost,
        purchaseDate: day(l.d),
        createdById: l.by.id,
      },
    });
    await db.stockMovement.create({
      data: { productId: products[l.p].id, lotId: lot.id, type: "IN", quantity: l.qty, occurredAt: day(l.d), createdById: l.by.id },
    });
    if (Number(l.paid) > 0) {
      await db.vendorPayment.create({
        data: { vendorId: l.v.id, amount: l.paid, paidAt: day(l.d), mode: "UPI", lotId: lot.id, note: "paid at purchase", createdById: l.by.id },
      });
    }
  }

  // Stock going out: sales and one damage adjustment.
  const outs = [
    { p: "sb", type: "SALE", qty: 900, d: 0, by: owner, note: "Amazon FBA inbound" },
    { p: "sb", type: "SALE", qty: 98, d: 5, by: owner, note: "Meesho orders, week 32" },
    { p: "ym", type: "SALE", qty: 26, d: 8, by: owner, note: "Amazon orders" },
    { p: "ct", type: "SALE", qty: 212, d: 3, by: owner, note: "Flipkart BBD prep" },
    { p: "ct", type: "DAMAGE", qty: 2, d: 1, by: priya, note: "2 damaged in transit" },
    { p: "jbl", type: "SALE", qty: 50, d: 6, by: owner, note: "Meesho orders" },
    { p: "jbs", type: "SALE", qty: 16, d: 9, by: owner, note: "Meesho orders" },
  ];
  for (const o of outs) {
    await db.stockMovement.create({
      data: { productId: products[o.p].id, type: o.type, quantity: o.qty, occurredAt: day(o.d), note: o.note, createdById: o.by.id },
    });
  }

  // Standalone vendor payments (not tied to a purchase).
  await db.vendorPayment.create({ data: { vendorId: mahavir.id, amount: "10000", paidAt: day(2), mode: "UPI", createdById: owner.id } });
  await db.vendorPayment.create({ data: { vendorId: ganesh.id, amount: "5000", paidAt: day(15), mode: "CASH", createdById: owner.id } });

  console.log("seeded:", {
    users: await db.user.count(),
    vendors: await db.vendor.count(),
    products: await db.product.count(),
    lots: await db.purchaseLot.count(),
    movements: await db.stockMovement.count(),
    payments: await db.vendorPayment.count(),
    audit: await db.auditLog.count(),
  });
}

main().finally(() => db.$disconnect());
