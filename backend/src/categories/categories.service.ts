import { Injectable, NotFoundException } from "@nestjs/common";
import { TransactionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: TransactionType) {
    const categories = await this.prisma.category.findMany({
      where: type ? { type } : {},
      orderBy: { sortOrder: "asc" },
    });
    return { data: categories };
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: { ...dto, isDefault: false },
    });
    return { data: category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      const category = await this.prisma.category.update({ where: { id }, data: dto });
      return { data: category };
    } catch {
      throw new NotFoundException("Kategori tidak ditemukan");
    }
  }
}
