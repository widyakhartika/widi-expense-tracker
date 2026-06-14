import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TransactionType } from "@prisma/client";
import { decimalToNumber, serializeWallet } from "../common/serializers";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWalletDto, UpdateWalletDto } from "./dto";

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(showInactive = false) {
    const wallets = await this.prisma.wallet.findMany({
      where: showInactive ? {} : { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return { data: wallets.map(serializeWallet) };
  }

  async create(dto: CreateWalletDto) {
    const balance = new Prisma.Decimal(dto.balance || 0);
    const wallet = await this.prisma.wallet.create({
      data: {
        ...dto,
        balance,
        openingBalance: balance,
      },
    });
    return { data: serializeWallet(wallet) };
  }

  async update(id: string, dto: UpdateWalletDto) {
    try {
      const wallet = await this.prisma.wallet.update({ where: { id }, data: dto });
      return { data: serializeWallet(wallet) };
    } catch {
      throw new NotFoundException("Wallet tidak ditemukan");
    }
  }

  async setBalance(id: string, balance: number) {
    try {
      const wallet = await this.prisma.wallet.update({
        where: { id },
        data: {
          balance,
          openingBalance: balance,
        },
      });
      return { data: serializeWallet(wallet) };
    } catch {
      throw new NotFoundException("Wallet tidak ditemukan");
    }
  }

  async recalculate(id: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id } });
    if (!wallet) throw new NotFoundException("Wallet tidak ditemukan");

    const [income, expense, transferOut, transferIn] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { walletId: id, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { walletId: id, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { walletId: id, type: TransactionType.TRANSFER },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { toWalletId: id, type: TransactionType.TRANSFER },
        _sum: { amount: true },
      }),
    ]);

    const openingBalance = decimalToNumber(wallet.openingBalance);
    const incomeTotal = decimalToNumber(income._sum.amount);
    const expenseTotal = decimalToNumber(expense._sum.amount);
    const transferOutTotal = decimalToNumber(transferOut._sum.amount);
    const transferInTotal = decimalToNumber(transferIn._sum.amount);
    const calculatedBalance =
      openingBalance + incomeTotal - expenseTotal - transferOutTotal + transferInTotal;

    const updated = await this.prisma.wallet.update({
      where: { id },
      data: { balance: calculatedBalance },
    });

    return {
      data: serializeWallet(updated),
      reconciliation: {
        openingBalance,
        income: incomeTotal,
        expense: expenseTotal,
        transferOut: transferOutTotal,
        transferIn: transferInTotal,
        calculatedBalance,
        previousBalance: decimalToNumber(wallet.balance),
        difference: calculatedBalance - decimalToNumber(wallet.balance),
      },
    };
  }
}
