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

Stock on hand is a **ledger, not a counter**. A mutable `quantity` column drifts
the first time two people save at once and there is no way to find out where it
went wrong. Summing movements is always reconcilable.

## Roles

| | ADMIN | STAFF |
| --- | --- | --- |
| Add products, vendors, purchases, movements | ✅ | ✅ |
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

**2. Auth + roles** — login, session middleware, admin-creates-user flow, route
guards, RLS policies.

**3. Masters** — vendor CRUD, product CRUD with image upload. Phone camera
photos are 3–5 MB; resize to ~1200px client-side before upload or the app is
unusable on mobile data.

**4. Purchases** — the primary screen. Bottom-sheet form, ~5 fields, vendor
picker with search, `inputMode="decimal"` on cost, date defaults to today.
Creating a lot writes its `IN` movement in the same transaction.

**5. Stock** — stock list with low-stock badges, stock-out / adjust form, per
product movement history.

**6. Prices** — cost trend chart per product, selling price history, margin view
comparing selling price against FIFO cost at that date.

**7. Reports** — dashboard: total stock value, monthly spend, spend by vendor,
activity by user, month-on-month cost change per product.

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
