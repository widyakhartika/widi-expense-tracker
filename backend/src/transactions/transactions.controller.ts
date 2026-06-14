import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { CreateTransactionDto, TransactionQueryDto, UpdateTransactionDto } from "./dto";
import { TransactionsService } from "./transactions.service";

@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactions.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateTransactionDto) {
    return this.transactions.create(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.transactions.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactions.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.transactions.remove(id);
  }
}
