import Link from "next/link";

// Phase-1 shell: the four sections of the app, laid out for one-thumb use.
// Each links to a stub page that the next phases fill in.
const sections = [
  {
    href: "/purchases",
    title: "Purchases",
    desc: "Record stock bought — vendor, quantity, unit cost.",
  },
  {
    href: "/stock",
    title: "Stock",
    desc: "What's on hand, low-stock alerts, adjustments.",
  },
  {
    href: "/products",
    title: "Products",
    desc: "SKUs, images, cost history per product.",
  },
  {
    href: "/login",
    title: "Sign in",
    desc: "Team accounts — every entry is attributed.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold">Seller Inventory</h1>
      <p className="mt-1 text-sm opacity-70">
        Stock, purchase prices and vendors — with history, not overwrites.
      </p>
      <nav className="mt-6 flex flex-col gap-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-stone-300 p-4 active:bg-stone-200 dark:border-stone-700 dark:active:bg-stone-800"
          >
            <div className="font-semibold">{s.title}</div>
            <div className="text-sm opacity-70">{s.desc}</div>
          </Link>
        ))}
      </nav>
    </main>
  );
}
