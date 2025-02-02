import { OrderService } from "@/order/order.service";
import { VoiceModule } from "@/voice/voice.module";
import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TelegrafModule } from "nestjs-telegraf";
import { PrismaService } from "../prisma.service";
import { TelegramService } from "./telegram.service";
import { TelegramServiceClient } from "./telegram.service.client";
import { TelegramUpdate } from "./telegram.update";

@Module({
  imports: [
    ConfigModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>("TELEGRAM_BOT_TOKEN"),
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => VoiceModule),
  ],
  providers: [TelegramService, TelegramUpdate, PrismaService, TelegramServiceClient, OrderService],
  exports: [TelegramService],
})
export class TelegramModule {}
