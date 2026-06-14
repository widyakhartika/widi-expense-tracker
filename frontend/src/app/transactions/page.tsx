"use client";

import { useEffect, useState } from "react";
import { api, formatIDR, formatDateShort, formatTime, Transaction } from "@/lib/api";

type FilterType = "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p: number = 1, type: FilterType = filter) => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(p),
      limit: "20",
    };
    if (type !== "ALL") params.type = type;

    api
      .getTransactions(params)
      .then((res) => {
        setTransactions(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
        setPage(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleFilter = (type: FilterType) => {
    setFilter(type);
    load(1, type);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await api.deleteTransaction(id);
      load(page);
    } catch (e) {
      alert("Gagal menghapus: " + (e as Error).message);
    }
  };

  const filters: { label: string; value: FilterType; color: string }[] = [
    { label: "Semua", value: "ALL", color: "bg-slate-100 text-slate-700" },
    { label: "Masuk", value: "INCOME", color: "bg-emerald-100 text-emerald-700" },
    { label: "Keluar", value: "EXPENSE", color: "bg-red-100 text-red-700" },
    { label: "Transfer", value: "TRANSFER", color: "bg-blue-100 text-blue-700" },
  ];

  // Group transactions by date
  const grouped = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      const key = formatDateShort(tx.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(tx);
      return acc;
    },
    {}
  );

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-900">Transaksi</h1>
        <p className="text-xs text-slate-400">{total} total</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.value
                ? f.color + " ring-2 ring-offset-1 ring-slate-300"
                : "bg-slate-50 text-slate-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Memuat...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center text-slate-400 py-12">
          <p className="text-4xl mb-2">📭</p>
          <p>Belum ada transaksi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                {date}
              </p>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-50">
                {txs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 group"
                  >
                    <span className="text-xl w-8 text-center">
                      {tx.type === "INCOME"
                        ? "💰"
                        : tx.type === "TRANSFER"
                          ? "🔄"
                          : tx.category?.icon || "💸"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.description || tx.category?.name || "Transaksi"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatTime(tx.date)} • {tx.wallet?.name || ""}
                        {tx.toWallet ? ` → ${tx.toWallet.name}` : ""}
                        {tx.category ? ` • ${tx.category.name}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all text-xs"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm bg-white rounded-lg shadow-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm bg-white rounded-lg shadow-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
