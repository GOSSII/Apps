// One shared vocabulary for audit entries, so the live banner, the bell and
// the activity log all describe an event the same way.
type Entry = { action: string; entity: string };

const VERBS: Record<string, string> = {
  CREATE: "added",
  UPDATE: "edited",
  DELETE: "deleted",
  UPSERT: "saved",
  CREATEMANY: "added",
  UPDATEMANY: "edited",
  DELETEMANY: "deleted",
  EXPORT: "exported",
};

const NOUNS: Record<string, string> = {
  Product: "a product",
  Vendor: "a vendor",
  PurchaseLot: "a purchase",
  StockMovement: "a stock movement",
  VendorPayment: "a vendor payment",
  SellingPrice: "a selling price",
  Listing: "a listing",
  User: "a user",
  Invite: "an invite",
};

export function auditLabel(e: Entry) {
  const verb = VERBS[e.action] ?? e.action.toLowerCase();
  if (e.action === "EXPORT") return { verb, noun: e.entity };
  return { verb, noun: NOUNS[e.entity] ?? e.entity };
}

// Ranking for the live banner: money events beat catalogue edits, so the
// owner's banner leads with "recorded a purchase", not the reorder-level
// side effect written in the same transaction.
export const BANNER_PRIORITY = ["PurchaseLot", "VendorPayment", "StockMovement"];
