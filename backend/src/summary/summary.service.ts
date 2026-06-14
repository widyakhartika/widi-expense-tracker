import { Injectable } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { decimalToNumber } from "../common/serializers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [wallets, monthlyIncome, monthlyExpense, expenseByCategory, recentTransactions] =
      await Promise.all([
        this.prisma.wallet.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
        this.prisma.transaction.aggregate({
          where: {
            type: TransactionType.INCOME,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            type: TransactionType.EXPENSE,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ["categoryId"],
          where: {
            type: TransactionType.EXPENSE,
            date: { gte: startOfMonth, lte: endOfMonth },
            categoryId: { not: null },
          },
          _sum: { amount: true },
          _count: true,
          orderBy: { _sum: { amount: "desc" } },
        }),
        this.prisma.transaction.findMany({
          include: { wallet: true, toWallet: true, category: true },
          orderBy: { date: "desc" },
          take: 10,
        }),
      ]);

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: expenseByCategory.map((item) => item.categoryId).filter(Boolean) as string[],
        },
      },
    });
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const income = decimalToNumber(monthlyIncome._sum.amount);
    const expense = decimalToNumber(monthlyExpense._sum.amount);

    return {
      data: {
        totalBalance: wallets.reduce((sum, wallet) => sum + decimalToNumber(wallet.balance), 0),
        monthlyIncome: income,
        monthlyExpense: expense,
        monthlyNet: income - expense,
        wallets: wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          type: wallet.type,
          balance: decimalToNumber(wallet.balance),
          icon: wallet.icon,
          color: wallet.color,
        })),
        expenseByCategory: expenseByCategory.map((item) => {
          const category = categoryMap.get(item.categoryId!);
          return {
            categoryId: item.categoryId,
            categoryName: category?.name || "Lainnya",
            categoryIcon: category?.icon,
            categoryColor: category?.color,
            total: decimalToNumber(item._sum.amount),
            count: item._count,
          };
        }),
        recentTransactions: recentTransactions.map((transaction) => ({
          id: transaction.id,
          type: transaction.type,
          amount: decimalToNumber(transaction.amount),
          description: transaction.description,
          date: transaction.date,
          walletName: transaction.wallet.name,
          toWalletName: transaction.toWallet?.name,
          categoryName: transaction.category?.name,
          categoryIcon: transaction.category?.icon,
          createdByTelegramId: transaction.createdByTelegramId,
          createdByName: transaction.createdByName,
        })),
      },
    };
  }

  async monthly(year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [income, expense, dailyExpenses, byCategory, byWallet] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.INCOME, date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: TransactionType.EXPENSE, date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<Array<{ day: Date; total: unknown }>>`
        SELECT DATE(date) as day, SUM(amount) as total
        FROM transactions
        WHERE type = 'EXPENSE'
          AND date >= ${startOfMonth}
          AND date <= ${endOfMonth}
        GROUP BY DATE(date)
        ORDER BY day ASC
      `,
      this.prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          type: TransactionType.EXPENSE,
          date: { gte: startOfMonth, lte: endOfMonth },
          categoryId: { not: null },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),
      this.prisma.transaction.groupBy({
        by: ["walletId"],
        where: { type: TransactionType.EXPENSE, date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

    const [categories, wallets] = await Promise.all([
      this.prisma.category.findMany({
        where: { id: { in: byCategory.map((item) => item.categoryId).filter(Boolean) as string[] } },
      }),
      this.prisma.wallet.findMany({ where: { id: { in: byWallet.map((item) => item.walletId) } } }),
    ]);
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const totalIncome = decimalToNumber(income._sum.amount);
    const totalExpense = decimalToNumber(expense._sum.amount);

    return {
      data: {
        period: { year, month },
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
        dailyExpenses: dailyExpenses.map((item) => ({
          day: item.day,
          total: decimalToNumber(item.total),
        })),
        byCategory: byCategory.map((item) => {
          const category = categoryMap.get(item.categoryId!);
          const total = decimalToNumber(item._sum.amount);
          return {
            categoryName: category?.name || "Lainnya",
            categoryIcon: category?.icon,
            categoryColor: category?.color,
            total,
            count: item._count,
            percentage: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
          };
        }),
        byWallet: byWallet.map((item) => {
          const wallet = walletMap.get(item.walletId);
          return {
            walletName: wallet?.name || "Unknown",
            walletIcon: wallet?.icon,
            total: decimalToNumber(item._sum.amount),
            count: item._count,
          };
        }),
      },
    };
  }
}
