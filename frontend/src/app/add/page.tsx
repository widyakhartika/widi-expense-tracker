"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Wallet, Category, formatIDR } from "@/lib/api";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER";

export default function AddPage() {
  const router = useRouter();

  // Form state
  const [type, setType] = useState<TxType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Data
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getWallets(), api.getCategories()]).then(
      ([w, c]) => {
        setWallets(w);
        setCategories(c);
        if (w.length > 0) setWalletId(w[0].id);
      }
    );
  }, []);

  // Filter categories by type
  const filteredCategories = categories.filter((c) => c.type === type);

  // Set default category when type changes
  useEffect(() => {
    const cats = categories.filter((c) => c.type === type);
    if (cats.length > 0 && !cats.find((c) => c.id === categoryId)) {
      setCategoryId(cats[0].id);
    }
  }, [type, categories]);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(/\D/g, ""));
    if (!numAmount || numAmount <= 0) {
      setError("Masukkan jumlah yang valid");
      return;
    }

    if (type === "TRANSFER" && !toWalletId) {
      setError("Pilih wallet tujuan");
      return;
    }

    if (type === "TRANSFER" && walletId === toWalletId) {
      setError("Wallet asal dan tujuan harus berbeda");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.createTransaction({
        type,
        amount: numAmount,
        description: description || undefined,
        walletId,
        toWalletId: type === "TRANSFER" ? toWalletId : undefined,
        categoryId: type !== "TRANSFER" ? categoryId : undefined,
      });

      setSuccess(true);
      setAmount("");
      setDescription("");

      // Auto-redirect setelah 1.5 detik
      setTimeout(() => {
        setSuccess(false);
        router.push("/");
      }, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Format amount display
  const displayAmount = amount
    ? formatIDR(parseFloat(amount.replace(/\D/g, "")) || 0)
    : "Rp 0";

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-6xl">✅</div>
        <p className="text-xl font-semibold text-slate-700">Tersimpan!</p>
        <p className="text-slate-400">Mengalihkan ke dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-900">Tambah Transaksi</h1>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-3 bg-slate-100 rounded-xl p-1">
        {(["EXPENSE", "INCOME", "TRANSFER"] as TxType[]).map((t) => {
          const labels: Record<TxType, { label: string; emoji: string }> = {
            EXPENSE: { label: "Keluar", emoji: "💸" },
            INCOME: { label: "Masuk", emoji: "💰" },
            TRANSFER: { label: "Transfer", emoji: "🔄" },
          };
          const isActive = type === t;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? t === "EXPENSE"
                    ? "bg-red-500 text-white shadow-sm"
                    : t === "INCOME"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-blue-500 text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {labels[t].emoji} {labels[t].label}
            </button>
          );
        })}
      </div>

      {/* Amount Input */}
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
        <p className="text-sm text-slate-400 mb-2">Jumlah</p>
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-3xl font-bold text-center w-full outline-none bg-transparent text-slate-900 placeholder-slate-200"
          autoFocus
        />
        <p className="text-sm text-slate-400 mt-1">{displayAmount}</p>
      </div>

      {/* Description */}
      <input
        type="text"
        placeholder="Deskripsi (opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-white rounded-xl px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-200 placeholder-slate-300"
      />

      {/* Wallet Selector */}
      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">
          {type === "TRANSFER" ? "Dari Wallet" : "Wallet"}
        </p>
        <div className="flex flex-wrap gap-2">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => setWalletId(w.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                walletId === w.id
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-white text-slate-600 shadow-sm"
              }`}
            >
              {w.icon} {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* To Wallet (Transfer only) */}
      {type === "TRANSFER" && (
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">Ke Wallet</p>
          <div className="flex flex-wrap gap-2">
            {wallets
              .filter((w) => w.id !== walletId)
              .map((w) => (
                <button
                  key={w.id}
                  onClick={() => setToWalletId(w.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    toWalletId === w.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-600 shadow-sm"
                  }`}
                >
                  {w.icon} {w.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Category (not for Transfer) */}
      {type !== "TRANSFER" && (
        <div>
          <p className="text-xs text-slate-500 font-medium mb-2">Kategori</p>
          <div className="grid grid-cols-3 gap-2">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all text-center ${
                  categoryId === c.id
                    ? "text-white shadow-sm"
                    : "bg-white text-slate-600 shadow-sm"
                }`}
                style={
                  categoryId === c.id
                    ? { backgroundColor: c.color || "#6366f1" }
                    : {}
                }
              >
                <span className="text-lg block mb-0.5">{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving || !amount}
        className={`w-full py-4 rounded-2xl font-semibold text-white text-base shadow-lg transition-all disabled:opacity-40 ${
          type === "EXPENSE"
            ? "bg-red-500 shadow-red-200"
            : type === "INCOME"
              ? "bg-emerald-500 shadow-emerald-200"
              : "bg-blue-500 shadow-blue-200"
        }`}
      >
        {saving ? "Menyimpan..." : "Simpan Transaksi"}
      </button>

      <div className="h-4" />
    </div>
  );
}
