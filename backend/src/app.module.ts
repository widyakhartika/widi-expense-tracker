import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { ApiKeyGuard } from "./common/api-key.guard";
import { CategoriesModule } from "./categories/categories.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SummaryModule } from "./summary/summary.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { WalletsModule } from "./wallets/wallets.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    PrismaModule,
    TransactionsModule,
    WalletsModule,
    CategoriesModule,
    SummaryModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
