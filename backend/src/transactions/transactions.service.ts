import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Transaction, TransactionType } from "@prisma/client";
import { serializeTransaction } from "../common/serializers";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDto, TransactionQueryDto, UpdateTransactionDto } from "./dto";

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TransactionQueryDto) {
    const pageNum = Math.max(1, Number(query.page || 1));
    const limitNum = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.TransactionWhereInput = {};
    if (query.walletId) where.walletId = query.walletId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.type) where.type = query.type;
    if (query.search) where.description = { contains: query.search, mode: "insensitive" };
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { wallet: true, toWallet: true, category: true },
        orderBy: { date: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map(serializeTransaction),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async create(dto: CreateTransactionDto) {
    this.validateBusinessRules(dto.type, dto.walletId, dto.toWalletId, dto.categoryId);

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          date: dto.date ? new Date(dto.date) : new Date(),
          walletId: dto.walletId,
          toWalletId: dto.type === TransactionType.TRANSFER ? dto.toWalletId : null,
          categoryId: dto.type === TransactionType.TRANSFER ? null : dto.categoryId,
          tags: dto.tags || [],
        },
        include: { wallet: true, toWallet: true, category: true },
      });

      await this.applyBalanceEffect(tx, dto.type, dto.walletId, new Prisma.Decimal(dto.amount), dto.toWalletId);
      return transaction;
    });

    return { data: serializeTransaction(result) };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { wallet: true, toWallet: true, category: true },
    });
    if (!transaction) throw new NotFoundException("Transaksi tidak ditemukan");
    return { data: serializeTransaction(transaction) };
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Transaksi tidak ditemukan");

    const nextType = dto.type || existing.type;
    const nextWalletId = dto.walletId || existing.walletId;
    const nextToWalletId = dto.toWalletId !== undefined ? dto.toWalletId : existing.toWalletId || undefined;
    const nextCategoryId =
      dto.categoryId !== undefined ? dto.categoryId : existing.categoryId || undefined;

    this.validateBusinessRules(nextType, nextWalletId, nextToWalletId, nextCategoryId);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.reverseBalanceEffect(tx, existing);

      const transaction = await tx.transaction.update({
        where: { id },
        data: {
          type: nextType,
          amount: dto.amount !== undefined ? dto.amount : existing.amount,
          description: dto.description !== undefined ? dto.description : existing.description,
          date: dto.date ? new Date(dto.date) : existing.date,
          walletId: nextWalletId,
          toWalletId: nextType === TransactionType.TRANSFER ? nextToWalletId : null,
          categoryId: nextType === TransactionType.TRANSFER ? null : nextCategoryId,
          tags: dto.tags !== undefined ? dto.tags : existing.tags,
        },
        include: { wallet: true, toWallet: true, category: true },
      });

      await this.applyBalanceEffect(
        tx,
        nextType,
        nextWalletId,
        new Prisma.Decimal(dto.amount !== undefined ? dto.amount : existing.amount),
        nextToWalletId
      );

      return transaction;
    });

    return { data: serializeTransaction(result) };
  }

  async remove(id: string) {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Transaksi tidak ditemukan");

    await this.prisma.$transaction(async (tx) => {
      await this.reverseBalanceEffect(tx, existing);
      await tx.transaction.delete({ where: { id } });
    });

    return { message: "Transaksi berhasil dihapus" };
  }

  private validateBusinessRules(
    type: TransactionType,
    walletId: string,
    toWalletId?: string,
    categoryId?: string
  ) {
    if (type === TransactionType.TRANSFER && !toWalletId) {
      throw new BadRequestException("Transfer harus menyertakan wallet tujuan");
    }
    if (type === TransactionType.TRANSFER && walletId === toWalletId) {
      throw new BadRequestException("Wallet asal dan tujuan tidak boleh sama");
    }
    if (type !== TransactionType.TRANSFER && !categoryId) {
      throw new BadRequestException("Kategori wajib untuk income/expense");
    }
  }

  private async applyBalanceEffect(
    tx: Prisma.TransactionClient,
    type: TransactionType,
    walletId: string,
    amount: Prisma.Decimal,
    toWalletId?: string | null
  ) {
    if (type === TransactionType.EXPENSE) {
      await tx.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } });
      return;
    }
    if (type === TransactionType.INCOME) {
      await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
      return;
    }
    await tx.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } });
    await tx.wallet.update({ where: { id: toWalletId! }, data: { balance: { increment: amount } } });
  }

  private async reverseBalanceEffect(tx: Prisma.TransactionClient, transaction: Transaction) {
    if (transaction.type === TransactionType.EXPENSE) {
      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: transaction.amount } },
      });
      return;
    }
    if (transaction.type === TransactionType.INCOME) {
      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { decrement: transaction.amount } },
      });
      return;
    }
    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: { balance: { increment: transaction.amount } },
    });
    if (transaction.toWalletId) {
      await tx.wallet.update({
        where: { id: transaction.toWalletId },
        data: { balance: { decrement: transaction.amount } },
      });
    }
  }
}
