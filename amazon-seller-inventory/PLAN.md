# Amazon Seller Inventory — build plan

Mobile-first web app (PWA) for a small team to track inventory, stock movements
and — the point of the whole thing — **what each batch of stock actually cost,
from which vendor, entered by which user**.

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind
- **Data:** Supabase Postgres via Prisma
- **Auth:** Supabase Auth, roles enforced in app middleware + RLS
- **Images:** Supabase Storage, resized client-side before upload
- **Deploy:** Vercel
- **Currency:** INR

## The core modelling decision

`Product` has no price column.

Every purchase creates a **`PurchaseLot`**: product + vendor + quantity + unit
cost + date + `createdBy`. June at ₹100 and July at ₹80 are two rows, not an
edit. Everything else is a query over lots:

| Question | Answer |
| --- | --- |
| Price history for product A | its lots, ordered by `purchaseDate` |
| Stock on hand | signed sum of `StockMovement` rows |
| Stock value | FIFO over unconsumed lots |
| Who bought at what price | `lot.createdBy` + `lot.unitCost` |
| Spend per vendor | lots grouped by `vendorId` |

Selling price lives in its own `SellingPrice` history table. Cost and selling
price move for unrelated reasons, and margin is only meaningful if each is
tracked on its own timeline.

Vendors are usually **not paid in full at purchase time**, so "paid" is not a
flag on a lot — it's a balance. `VendorPayment` records each amount actually
handed over (date, mode, who recorded it, optionally against a specific lot),
and what a vendor is owed is the sum of their lots minus the sum of their
payments. The purchase form takes an optional "paid now" amount that books the
lot and the payment in one save; the admin dashboard leads with total dues and
the per-vendor split, and each vendor gets a ledger view — purchases one side,
payments the other, balance at the bottom.

Stock on hand is a **ledger, not a counter**. A mutable `quantity` column drifts
the first time two people save at once and there is no way to find out where it
went wrong. Summing movements is always reconcilable.

## Roles

| | ADMIN | STAFF |
| --- | --- | --- |
| Add products, vendors, purchases, movements | ✅ | ✅ |
| Record vendor payments | ✅ | ✅ ("paid now" at purchase) |
| See vendor dues, balances and ledgers | ✅ | ❌ |
| Edit own entries | ✅ | ✅ within 24h |
| Edit/delete anyone's entries | ✅ | ❌ |
| Cost, margin and spend reports | ✅ | own entries only |
| User management | ✅ | ❌ |
| Audit log | ✅ | ❌ |

## Immutability

Editing a lot after the fact silently rewrites financial history. So: lots are
editable for 24h by their author, and after that a correction requires a new
adjusting entry. Both paths are logged. This matters more than it sounds — it is
the difference between "the numbers disagree" and "the numbers disagree and we
can see why".

## Audit log

Written by a single Prisma `$extends` query hook covering every mutation, plus
explicit entries for login/logout. Not written by hand at each call site — a log
that depends on the author remembering to call it is a log with holes in it.

Captures actor, action, entity, entity id, before/after JSON, IP, user agent,
timestamp. Admin-only viewer with filters by user, date range and entity.

## Phases

**1. Skeleton** — Next.js + TS + Tailwind + Prisma, Supabase project, PWA
manifest and icons, CI running lint + typecheck + tests.

**2. Auth + roles** — Google sign-in only (Supabase OAuth); no passwords
anywhere. First sign-in creates the account in a pending state, and the owner
approves who gets in; the owner account is activated by the seed. Session
middleware, route guards, RLS policies.

**3. Masters** — vendor CRUD, and a dedicated add-product screen that is
identity only: photo (camera or gallery), title, SKU, optional ASIN,
category. Carton size and reorder point are deliberately NOT here — both are
captured on the purchase flow, where the buyer actually knows them. Phone
camera photos are 3–5 MB; resize to ~1200px client-side before upload or the
app is unusable on mobile data.

Purchases happen in cartons: the purchase form takes cartons × pcs-per-carton
(pre-filled from this product's most recent lot, editable per purchase) and
computes total pieces and total cost on screen before save. `quantity` on the
lot is always the canonical piece count; the carton breakdown is stored on
the lot. Loose products use carton size 1. The form also exposes the
product's reorder point for adjustment at purchase time.

Per-vendor page: totals bought (by product, with lot count and average cost),
the money ledger (purchases and payments interleaved), balance due, and a
record-payment action.

Role gating of screens is deliberately deferred: v1 shows every screen to
every signed-in user, and which screens become admin-only is decided after the
design is settled. The audit log records everything regardless of who can see
it.

**4. Purchases** — the primary screen. Bottom-sheet form, ~5 fields, vendor
picker with search, `inputMode="decimal"` on cost, date defaults to today.
Creating a lot writes its `IN` movement in the same transaction, and an
optional "paid now" amount books a `VendorPayment` in that transaction too.

**5. Stock** — stock list with low-stock badges, stock-out / adjust form, per
product movement history.

**6. Prices** — cost trend chart per product, selling price history, margin view
comparing selling price against FIFO cost at that date.

**7. Reports** — admin dashboard: total stock value, monthly spend, **vendor
dues** (total to pay + per-vendor split), spend by vendor, activity by user,
month-on-month cost change per product. Per-vendor ledger screen: purchases
and payments interleaved, balance due, record-payment action.

**8. Audit log viewer** — admin only, filterable, before/after diff view.

**9. Polish** — CSV import/export, barcode scan for SKU, offline-tolerant forms.

Phases 1–5 produce a usable app. 6–9 are the review-and-oversight layer.

## Deliberately out of scope for v1

- Amazon SP-API sync. The `Product.asin` field is there so it can be added
  later without a migration, but SP-API needs Seller Central developer approval
  which takes weeks and would block everything else.
- Multi-warehouse. Single stock location assumed; adding a `location` dimension
  later means one column on `StockMovement`.
- Purchase orders / GRN workflow. Purchases are recorded after the fact.
