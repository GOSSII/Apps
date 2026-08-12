# StockBook

Mobile-first web app for a small marketplace-seller team (Amazon, Flipkart,
Meesho & more): what was bought, from which vendor, at what price, entered by
whom — with history, not overwrites.

**The one design rule:** cost price never lives on the product. Every purchase
is a `PurchaseLot` (product + vendor + qty + unit cost + date + who entered
it). Bought at ₹100 in June and ₹80 in July? That's two lots. Price history,
stock valuation, vendor spend and per-user attribution are all queries over
lots. See [PLAN.md](PLAN.md) for the full design and build phases.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · Prisma · Supabase
(Postgres, Auth, Storage) · Vercel

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project values
npx prisma migrate dev # create the schema
npm run dev
```

## Status

Phase 1 (skeleton) of the nine phases in [PLAN.md](PLAN.md). The schema in
`prisma/schema.prisma` is complete; the screens are stubs.

> This app is staged inside `gossii/apps` temporarily and is fully
> self-contained in this folder — it moves to its own repository
> (`gossii/amazon-seller-inventory`) once that repo exists.
