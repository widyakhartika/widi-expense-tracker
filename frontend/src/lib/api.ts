const API_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `API error: ${res.status}`);
  }

  return res.json();
}

export interface Wallet {
  id: string;
  name: string;
  type: string;
  balance: number;
  openingBalance?: number;
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
  wallet?: Wallet;
  toWallet?: Wallet;
  category?: Category;
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
    categoryColor: string;
    total: number;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
    walletName: string;
    toWalletName?: string;
    categoryName: string;
    categoryIcon: string;
  }>;
}

export const api = {
  getDashboard: () =>
    request<{ data: DashboardData }>("/summary/dashboard").then((r) => r.data),

  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{
      data: Transaction[];
      pagination: { page: number; total: number; totalPages: number };
    }>(`/transactions${qs}`);
  },

  getWallets: () =>
    request<{ data: Wallet[] }>("/wallets").then((r) => r.data),

  getCategories: (type?: string) =>
    request<{ data: Category[] }>(
      `/categories${type ? `?type=${type}` : ""}`
    ).then((r) => r.data),

  createTransaction: (data: {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    amount: number;
    description?: string;
    walletId: string;
    toWalletId?: string;
    categoryId?: string;
  }) =>
    request<{ data: Transaction }>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string) =>
    request(`/transactions/${id}`, { method: "DELETE" }),

  setWalletBalance: (id: string, balance: number) =>
    request(`/wallets/${id}/set-balance`, {
      method: "PATCH",
      body: JSON.stringify({ balance }),
    }),
};

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin";

  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
