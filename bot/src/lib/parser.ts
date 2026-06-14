// =============================================================================
// MESSAGE PARSER — Mengubah pesan teks jadi data transaksi
// =============================================================================
// Contoh input → output:
//   "makan 25k"        → { amount: 25000, desc: "makan", type: EXPENSE, cat: Makanan }
//   "gaji 8jt"         → { amount: 8000000, desc: "gaji", type: INCOME, cat: Gaji }
//   "kopi starbucks 45000" → { amount: 45000, desc: "kopi starbucks", type: EXPENSE }
// =============================================================================

export interface ParsedMessage {
  amount: number;
  description: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  suggestedCategoryId: string;
  suggestedCategoryName: string;
}

// ---------------------------------------------------------------------------
// Keyword → Category mapping
// ---------------------------------------------------------------------------
// Saat user ketik "makan 25k", kata "makan" akan dicocokkan ke kategori
// "Makanan & Minuman" secara otomatis. User tetap bisa ganti via tombol.

const CATEGORY_KEYWORDS: Array<{
  id: string;
  name: string;
  icon: string;
  type: "INCOME" | "EXPENSE";
  keywords: string[];
}> = [
  // --- EXPENSE ---
  {
    id: "exp-makanan---minuman",
    name: "🍔 Makanan & Minuman",
    icon: "🍔",
    type: "EXPENSE",
    keywords: [
      "makan", "minum", "kopi", "teh", "nasi", "ayam", "bakso", "mie",
      "sate", "resto", "warteg", "cafe", "snack", "jajan", "sarapan",
      "lunch", "dinner", "breakfast", "indomie", "gorengan", "es",
      "juice", "boba", "pizza", "burger", "sushi", "roti", "kue",
      "buah", "sayur", "lauk", "nongkrong", "starbucks", "chatime",
    ],
  },
  {
    id: "exp-transportasi",
    name: "🚗 Transportasi",
    icon: "🚗",
    type: "EXPENSE",
    keywords: [
      "grab", "gojek", "ojol", "ojek", "bensin", "bbm", "parkir",
      "tol", "angkot", "bus", "kereta", "krl", "mrt", "lrt", "taxi",
      "uber", "transport", "pertalite", "pertamax", "solar",
    ],
  },
  {
    id: "exp-belanja",
    name: "🛍️ Belanja",
    icon: "🛍️",
    type: "EXPENSE",
    keywords: [
      "belanja", "beli", "shopee", "tokped", "tokopedia", "lazada",
      "bukalapak", "blibli", "toko", "mall", "alfamart", "indomaret",
    ],
  },
  {
    id: "exp-tagihan---utilitas",
    name: "📱 Tagihan & Utilitas",
    icon: "📱",
    type: "EXPENSE",
    keywords: [
      "listrik", "pln", "air", "pdam", "internet", "wifi", "indihome",
      "pulsa", "paket data", "tagihan", "bayar", "token", "iuran",
      "pbb", "pajak", "asuransi", "bpjs",
    ],
  },
  {
    id: "exp-hiburan",
    name: "🎬 Hiburan",
    icon: "🎬",
    type: "EXPENSE",
    keywords: [
      "nonton", "film", "bioskop", "game", "netflix", "spotify",
      "youtube", "hiburan", "main", "premium", "langganan", "subscribe",
    ],
  },
  {
    id: "exp-kesehatan",
    name: "💊 Kesehatan",
    icon: "💊",
    type: "EXPENSE",
    keywords: [
      "obat", "dokter", "apotek", "rumah sakit", "rs", "klinik",
      "vitamin", "kesehatan", "lab", "periksa", "gigi",
    ],
  },
  {
    id: "exp-pendidikan",
    name: "📚 Pendidikan",
    icon: "📚",
    type: "EXPENSE",
    keywords: [
      "buku", "kursus", "course", "udemy", "sekolah", "kuliah",
      "les", "training", "sertifikasi", "seminar",
    ],
  },
  {
    id: "exp-rumah-tangga",
    name: "🏠 Rumah Tangga",
    icon: "🏠",
    type: "EXPENSE",
    keywords: [
      "sabun", "deterjen", "tissue", "gas", "galon", "rumah",
      "sewa", "kos", "kontrakan", "kost", "cleaning",
    ],
  },
  {
    id: "exp-pribadi",
    name: "👤 Pribadi",
    icon: "👤",
    type: "EXPENSE",
    keywords: [
      "baju", "celana", "sepatu", "jam", "haircut", "cukur",
      "salon", "skincare", "laundry", "potong rambut",
    ],
  },
  {
    id: "exp-sosial",
    name: "🎁 Sosial",
    icon: "🎁",
    type: "EXPENSE",
    keywords: [
      "gift", "kado", "sumbangan", "sedekah", "infaq", "zakat",
      "donasi", "traktir", "arisan",
    ],
  },

  // --- INCOME ---
  {
    id: "inc-gaji",
    name: "💰 Gaji",
    icon: "💰",
    type: "INCOME",
    keywords: ["gaji", "salary", "payroll"],
  },
  {
    id: "inc-freelance",
    name: "💻 Freelance",
    icon: "💻",
    type: "INCOME",
    keywords: ["freelance", "project", "proyek", "klien", "client"],
  },
  {
    id: "inc-bonus",
    name: "🎉 Bonus",
    icon: "🎉",
    type: "INCOME",
    keywords: ["bonus", "thr", "insentif", "reward"],
  },
  {
    id: "inc-cashback",
    name: "💸 Cashback",
    icon: "💸",
    type: "INCOME",
    keywords: ["cashback", "refund", "rebate", "promo"],
  },
  {
    id: "inc-investasi",
    name: "📈 Investasi",
    icon: "📈",
    type: "INCOME",
    keywords: ["dividen", "bunga", "interest", "return", "yield"],
  },
];

// ---------------------------------------------------------------------------
// Amount Parser — Mendukung format Indonesia
// ---------------------------------------------------------------------------
// "25000"  → 25000
// "25k"    → 25000
// "25rb"   → 25000
// "25ribu" → 25000
// "2.5jt"  → 2500000
// "2juta"  → 2000000

function parseAmount(text: string): { amount: number; remaining: string } | null {
  // Cari angka + optional suffix di akhir string
  const regex = /(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)?\s*$/i;
  const match = text.match(regex);

  if (!match) return null;

  let amount = parseFloat(match[1].replace(",", "."));
  const suffix = match[2]?.toLowerCase();

  if (suffix === "k" || suffix === "rb" || suffix === "ribu") {
    amount *= 1000;
  } else if (suffix === "jt" || suffix === "juta") {
    amount *= 1000000;
  }

  if (amount <= 0 || isNaN(amount)) return null;

  // Sisa teks setelah hapus angka = deskripsi
  const remaining = text.replace(regex, "").trim();

  return { amount, remaining };
}

// ---------------------------------------------------------------------------
// Category Matcher — Cocokkan keyword ke kategori
// ---------------------------------------------------------------------------

function matchCategory(description: string): {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
} {
  const lower = description.toLowerCase();

  for (const cat of CATEGORY_KEYWORDS) {
    for (const keyword of cat.keywords) {
      if (lower.includes(keyword)) {
        return { id: cat.id, name: cat.name, type: cat.type };
      }
    }
  }

  // Default: Lainnya (Expense)
  return {
    id: "exp-lainnya",
    name: "📌 Lainnya",
    type: "EXPENSE",
  };
}

// ---------------------------------------------------------------------------
// Main Parser
// ---------------------------------------------------------------------------

export function parseMessage(text: string): ParsedMessage | null {
  // Skip commands
  if (text.startsWith("/")) return null;

  const normalized = text.trim();
  if (!normalized) return null;

  const parsed = parseAmount(normalized);
  if (!parsed) return null;

  const { amount, remaining: description } = parsed;
  if (!description) return null;

  const category = matchCategory(description);

  return {
    amount,
    description,
    type: category.type,
    suggestedCategoryId: category.id,
    suggestedCategoryName: category.name,
  };
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCategoryList(): typeof CATEGORY_KEYWORDS {
  return CATEGORY_KEYWORDS;
}
