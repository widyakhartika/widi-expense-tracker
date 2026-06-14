"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transaksi", icon: "📋" },
  { href: "/add", label: "Tambah", icon: "➕", highlight: true },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors ${
                item.highlight
                  ? "bg-blue-600 text-white rounded-full w-14 h-14 justify-center -mt-5 shadow-lg shadow-blue-200"
                  : isActive
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className={item.highlight ? "text-2xl" : "text-xl"}>
                {item.icon}
              </span>
              {!item.highlight && (
                <span className="text-[10px] font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
