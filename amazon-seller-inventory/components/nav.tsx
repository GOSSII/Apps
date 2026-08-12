"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBag, IconBox, IconGrid, IconTag } from "./icons";

const items = [
  { href: "/", label: "Overview", Icon: IconGrid },
  { href: "/stock", label: "Stock", Icon: IconBox },
  { href: "/purchases", label: "Purchases", Icon: IconBag },
  { href: "/products", label: "Products", Icon: IconTag },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <nav className="fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-md rounded-full bg-forest px-2 py-1.5 shadow-lg shadow-forest/30">
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`pressable flex flex-1 flex-col items-center gap-0.5 py-0.5 text-[0.62rem] font-bold ${
              active ? "text-forest-ink" : "text-nav-idle"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                active ? "bg-lime text-[#1e3b2c]" : ""
              }`}
            >
              <Icon className="h-[17px] w-[17px]" />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
