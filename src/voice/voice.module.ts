import { PrismaService } from "@/prisma.service";
import { TelegramModule } from "@/telegram/telegram.module";
import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SberVoiceService } from "./sber.service";
import { VoiceController } from "./voice.controller";
import { VoiceService } from "./voice.service";

@Module({
  imports: [ConfigModule, forwardRef(() => TelegramModule)],
  controllers: [VoiceController],
  providers: [VoiceService, SberVoiceService, PrismaService],
  exports: [VoiceService],
})
export class VoiceModule {}
