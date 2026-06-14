// =============================================================================
// SEED DATA — Data awal yang langsung siap pakai
// =============================================================================
// File ini dijalankan sekali saat setup pertama:
//   npx prisma db seed
//
// Isinya: wallet Anda + kategori default Indonesia.
// Balance semua wallet dimulai dari 0 — Anda akan set saldo awal nanti.
// =============================================================================

import { PrismaClient, WalletType, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---------------------------------------------------------------------------
  // WALLETS — Sesuai dengan rekening & e-wallet Anda
  // ---------------------------------------------------------------------------
  // CATATAN: Tidak ada nomor rekening di sini. Hanya nama wallet.
  // Nomor rekening adalah data sensitif — jangan simpan di kode.

  const wallets = [
    {
      name: "Cash",
      type: WalletType.CASH,
      icon: "💵",
      color: "#22C55E",
      sortOrder: 0,
    },
    {
      name: "BRI",
      type: WalletType.BANK,
      icon: "🏦",
      color: "#00529C",
      sortOrder: 1,
    },
    {
      name: "Mandiri",
      type: WalletType.BANK,
      icon: "🏦",
      color: "#003D79",
      sortOrder: 2,
    },
    {
      name: "Seabank",
      type: WalletType.DIGITAL_BANK,
      icon: "🏦",
      color: "#0DB0A7",
      sortOrder: 3,
    },
    {
      name: "Jago",
      type: WalletType.DIGITAL_BANK,
      icon: "🏦",
      color: "#FFD600",
      sortOrder: 4,
    },
    {
      name: "Superbank",
      type: WalletType.DIGITAL_BANK,
      icon: "🏦",
      color: "#6C63FF",
      sortOrder: 5,
    },
    {
      name: "Dana",
      type: WalletType.EWALLET,
      icon: "💳",
      color: "#108EE9",
      sortOrder: 6,
    },
    {
      name: "GoPay",
      type: WalletType.EWALLET,
      icon: "💳",
      color: "#00AED6",
      sortOrder: 7,
    },
    {
      name: "ShopeePay",
      type: WalletType.EWALLET,
      icon: "🛒",
      color: "#EE4D2D",
      sortOrder: 8,
    },
    {
      name: "OVO",
      type: WalletType.EWALLET,
      icon: "💳",
      color: "#4C3494",
      sortOrder: 9,
    },
  ];

  for (const wallet of wallets) {
    await prisma.wallet.upsert({
      where: { id: wallet.name.toLowerCase() },
      update: wallet,
      create: { id: wallet.name.toLowerCase(), ...wallet, openingBalance: 0 },
    });
  }
  console.log(`  ✅ ${wallets.length} wallets created`);

  // ---------------------------------------------------------------------------
  // CATEGORIES — Default untuk konteks Indonesia
  // ---------------------------------------------------------------------------
  // Dibagi dua: EXPENSE categories dan INCOME categories.
  // Anda bisa tambah/edit kategori nanti lewat API atau dashboard.

  const expenseCategories = [
    { name: "Makanan & Minuman", icon: "🍔", color: "#F97316" },
    { name: "Transportasi", icon: "🚗", color: "#3B82F6" },
    { name: "Belanja", icon: "🛍️", color: "#EC4899" },
    { name: "Tagihan & Utilitas", icon: "📱", color: "#EF4444" },
    { name: "Hiburan", icon: "🎬", color: "#8B5CF6" },
    { name: "Kesehatan", icon: "💊", color: "#10B981" },
    { name: "Pendidikan", icon: "📚", color: "#06B6D4" },
    { name: "Rumah Tangga", icon: "🏠", color: "#F59E0B" },
    { name: "Pribadi", icon: "👤", color: "#6366F1" },
    { name: "Sosial", icon: "🎁", color: "#14B8A6" },
    { name: "Lainnya", icon: "📌", color: "#6B7280" },
  ];

  const incomeCategories = [
    { name: "Gaji", icon: "💰", color: "#22C55E" },
    { name: "Freelance", icon: "💻", color: "#3B82F6" },
    { name: "Bonus", icon: "🎉", color: "#F59E0B" },
    { name: "Investasi", icon: "📈", color: "#8B5CF6" },
    { name: "Cashback", icon: "💸", color: "#EC4899" },
    { name: "Lainnya", icon: "📌", color: "#6B7280" },
  ];

  let categoryOrder = 0;

  for (const cat of expenseCategories) {
    const id = `exp-${cat.name.toLowerCase().replace(/[^a-z]/g, "-")}`;
    await prisma.category.upsert({
      where: { id },
      update: { ...cat, type: TransactionType.EXPENSE },
      create: {
        id,
        ...cat,
        type: TransactionType.EXPENSE,
        isDefault: true,
        sortOrder: categoryOrder++,
      },
    });
  }

  for (const cat of incomeCategories) {
    const id = `inc-${cat.name.toLowerCase().replace(/[^a-z]/g, "-")}`;
    await prisma.category.upsert({
      where: { id },
      update: { ...cat, type: TransactionType.INCOME },
      create: {
        id,
        ...cat,
        type: TransactionType.INCOME,
        isDefault: true,
        sortOrder: categoryOrder++,
      },
    });
  }

  console.log(
    `  ✅ ${expenseCategories.length + incomeCategories.length} categories created`
  );
  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
