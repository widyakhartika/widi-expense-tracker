"use client";

import { useEffect, useState } from "react";
import { api, formatIDR, formatDateShort, formatTime, DashboardData } from "@/lib/api";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .getDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400 text-lg">Memuat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
          <p className="font-semibold">Gagal memuat data</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-red-400">
            Pastikan backend API berjalan di{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalExpense = data.monthlyExpense;
  const maxCat = data.expenseByCategory[0]?.total || 1;

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <p className="text-sm text-slate-500">Total Saldo</p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {formatIDR(data.totalBalance)}
        </h1>
      </div>

      {/* Monthly Income / Expense Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-sm">
              📈
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              Pemasukan
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-700">
            {formatIDR(data.monthlyIncome)}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-sm">
              📉
            </span>
            <span className="text-xs text-red-600 font-medium">
              Pengeluaran
            </span>
          </div>
          <p className="text-lg font-bold text-red-700">
            {formatIDR(data.monthlyExpense)}
          </p>
        </div>
      </div>

      {/* Net this month */}
      <div
        className={`rounded-2xl p-4 ${
          data.monthlyNet >= 0
            ? "bg-blue-50 text-blue-700"
            : "bg-orange-50 text-orange-700"
        }`}
      >
        <p className="text-xs font-medium opacity-70">Selisih Bulan Ini</p>
        <p className="text-xl font-bold">
          {data.monthlyNet >= 0 ? "+" : ""}
          {formatIDR(data.monthlyNet)}
        </p>
      </div>

      {/* Wallets */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
          Wallet
        </h2>
        <div className="space-y-2">
          {data.wallets.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: w.color + "20" }}
                >
                  {w.icon}
                </span>
                <div>
                  <p className="font-medium text-sm">{w.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase">
                    {w.type.replace("_", " ")}
                  </p>
                </div>
              </div>
              <p
                className={`font-semibold text-sm ${
                  w.balance < 0 ? "text-red-500" : "text-slate-800"
                }`}
              >
                {formatIDR(w.balance)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Expense by Category */}
      {data.expenseByCategory.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Pengeluaran per Kategori
          </h2>
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            {data.expenseByCategory.map((cat, i) => {
              const pct =
                totalExpense > 0
                  ? Math.round((cat.total / totalExpense) * 100)
                  : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">
                      {cat.categoryIcon} {cat.categoryName}
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                      {formatIDR(cat.total)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.categoryColor || "#6366f1",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 text-right">
                    {pct}% • {cat.count}x
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      {data.recentTransactions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Transaksi Terakhir
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-3">
                <span className="text-xl w-8 text-center">
                  {tx.type === "INCOME"
                    ? "💰"
                    : tx.type === "TRANSFER"
                      ? "🔄"
                      : tx.categoryIcon || "💸"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tx.description || tx.categoryName || "Transaksi"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatDateShort(tx.date)} • {tx.walletName}
                    {tx.toWalletName ? ` → ${tx.toWalletName}` : ""}
                    {tx.createdByName ? ` • oleh ${tx.createdByName}` : ""}
                  </p>
                </div>
                <p
                  className={`font-semibold text-sm whitespace-nowrap ${
                    tx.type === "INCOME"
                      ? "text-emerald-600"
                      : tx.type === "EXPENSE"
                        ? "text-red-500"
                        : "text-blue-500"
                  }`}
                >
                  {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                  {formatIDR(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Spacer for bottom nav */}
      <div className="h-4" />
    </div>
  );
}
