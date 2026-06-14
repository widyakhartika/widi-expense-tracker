import "./globals.css";
import type { Metadata } from "next";
import type { Viewport } from "next";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Widi Expense Tracker",
  description: "Personal finance tracker",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 min-h-screen pb-20">
        <main className="max-w-lg mx-auto">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
