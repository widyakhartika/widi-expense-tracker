import { WalletType } from "@prisma/client";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateWalletDto {
  @IsString()
  name!: string;

  @IsEnum(WalletType)
  type!: WalletType;

  @IsOptional()
  @IsNumber()
  balance?: number = 0;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class SetBalanceDto {
  @IsNumber()
  balance!: number;
}
