import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seller Inventory",
  description:
    "Inventory, stock and purchase-price tracking for an Amazon seller team.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inventory",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays enabled; disabling it is an accessibility trap.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
