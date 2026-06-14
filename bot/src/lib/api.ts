// =============================================================================
// API CLIENT — Menghubungkan Bot ke Backend API
// =============================================================================

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const API_KEY = process.env.API_KEY || "";

if (!API_KEY) {
  throw new Error("API_KEY belum diset untuk Telegram bot");
}

interface ApiResponse<T> {
  data: T;
  pagination?: { page: number; total: number; totalPages: number };
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return (await res.json()) as T;
}

// --- Types ---

export interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  icon: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  description: string;
  date: string;
  walletName?: string;
  toWalletName?: string;
  categoryName?: string;
  categoryIcon?: string;
}

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  wallets: Wallet[];
  expenseByCategory: Array<{
    categoryName: string;
    categoryIcon: string;
    total: number;
    percentage: number;
  }>;
  recentTransactions: Transaction[];
}

// --- API Functions ---

export const api = {
  getWallets: () =>
    request<ApiResponse<Wallet[]>>("/api/wallets").then((r) => r.data),

  getCategories: (type?: string) =>
    request<ApiResponse<Category[]>>(
      `/api/categories${type ? `?type=${type}` : ""}`
    ).then((r) => r.data),

  createTransaction: (data: {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    description?: string;
    walletId: string;
    toWalletId?: string;
    categoryId?: string;
  }) =>
    request<ApiResponse<any>>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((r) => r.data),

  getDashboard: () =>
    request<ApiResponse<DashboardData>>("/api/summary/dashboard").then(
      (r) => r.data
    ),

  getMonthly: (year: number, month: number) =>
    request<ApiResponse<any>>(
      `/api/summary/monthly?year=${year}&month=${month}`
    ).then((r) => r.data),
};
