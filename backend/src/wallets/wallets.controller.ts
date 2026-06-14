import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { CreateWalletDto, SetBalanceDto, UpdateWalletDto } from "./dto";
import { WalletsService } from "./wallets.service";

@Controller("wallets")
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  findAll(@Query("all") all?: string) {
    return this.wallets.findAll(all === "true");
  }

  @Post()
  create(@Body() dto: CreateWalletDto) {
    return this.wallets.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateWalletDto) {
    return this.wallets.update(id, dto);
  }

  @Patch(":id/set-balance")
  setBalance(@Param("id") id: string, @Body() dto: SetBalanceDto) {
    return this.wallets.setBalance(id, dto.balance);
  }

  @Patch(":id/recalculate")
  recalculate(@Param("id") id: string) {
    return this.wallets.recalculate(id);
  }
}
