import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { TelegramModule } from "../telegram/telegram.module";
import { OrderResolver } from "./order.resolver";
import { OrderService } from "./order.service";

@Module({
  imports: [TelegramModule],
  providers: [OrderService, PrismaService, OrderResolver],
  exports: [OrderService],
})
export class OrderModule {}
