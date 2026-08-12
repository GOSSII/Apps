import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/nav";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["600", "700", "800"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StockBook",
  description:
    "Stock, purchases and vendor money for marketplace sellers — Amazon, Flipkart, Meesho and more.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "StockBook" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3b2c",
  // Pinch-zoom stays enabled; disabling it is an accessibility trap.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto max-w-md px-4 pb-28 pt-2">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
