import { PrismaService } from "@/prisma.service";
import { TelegramService } from "@/telegram/telegram.service";
import { Body, Controller, Inject, Post, forwardRef } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsNumber, IsString, ValidateNested } from "class-validator";

class VoiceSettingsDto {
  @IsString()
  voiceId: string;

  @IsNumber()
  speed: number;

  @IsNumber()
  pitch: number;
}

class UpdateSettingsDto {
  @ValidateNested()
  @Type(() => VoiceSettingsDto)
  settings: VoiceSettingsDto;
}

@Controller("voice")
export class VoiceController {
  // Маппинг имен голосов в их коды
  private readonly VOICE_CODES = {
    natalya: "Nec_24000", // Наталья (24 кГц)
    boris: "Bys_24000", // Борис (24 кГц)
    marfa: "May_24000", // Марфа (24 кГц)
    alexandra: "Ost_24000", // Александра (24 кГц)
    taras: "Tur_24000", // Тарас (24 кГц)
    sergey: "Pon_24000", // Сергей (24 кГц)
    kira_eng: "Kin_24000", // Kira (24 кГц) - English
  };

  // Маппинг кодов голосов в их характеристики
  private readonly VOICE_INFO = {
    Nec: { name: "Наталья", gender: "female", quality: { "24000": "Nec_24000", "8000": "Nec_8000" } },
    Bys: { name: "Борис", gender: "male", quality: { "24000": "Bys_24000", "8000": "Bys_8000" } },
    May: { name: "Марфа", gender: "female", quality: { "24000": "May_24000", "8000": "May_8000" } },
    Ost: { name: "Александра", gender: "female", quality: { "24000": "Ost_24000", "8000": "Ost_8000" } },
    Tur: { name: "Тарас", gender: "male", quality: { "24000": "Tur_24000", "8000": "Tur_8000" } },
    Pon: { name: "Сергей", gender: "male", quality: { "24000": "Pon_24000", "8000": "Pon_8000" } },
    Kin: { name: "Kira", gender: "female", quality: { "24000": "Kin_24000", "8000": "Kin_8000" } },
  };

  // Получаем код голоса с наилучшим качеством
  private getBestQualityVoiceCode(baseCode: string): string {
    const voicePrefix = baseCode.split("_")[0];
    const voiceInfo = this.VOICE_INFO[voicePrefix];
    return voiceInfo?.quality["24000"] || baseCode;
  }

  // Проверка на женский голос
  private isFemaleVoice(voiceCode: string): boolean {
    const voicePrefix = voiceCode.split("_")[0];
    return this.VOICE_INFO[voicePrefix]?.gender === "female" || false;
  }

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  @Post("settings")
  async updateSettings(@Body() data: { userId: string; settings: VoiceSettingsDto }) {
    try {
      console.log("=== Voice Controller: Received request ===");
      console.log("userId:", data.userId);
      console.log("Original voice ID:", data.settings.voiceId);

      // Преобразуем имя голоса в код и выбираем лучшее качество
      let voiceCode = this.VOICE_CODES[data.settings.voiceId.toLowerCase()] || data.settings.voiceId;
      voiceCode = this.getBestQualityVoiceCode(voiceCode);

      console.log("Mapped voice code:", voiceCode);
      console.log("Is female voice:", this.isFemaleVoice(voiceCode));

      // Сначала проверяем/создаем пользователя
      let user = await this.prisma.user.findFirst({
        where: { telegram_id: data.userId },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            telegram_id: data.userId,
            state: "INITIAL",
            balance: 0,
          },
        });
      }

      // Проверяем, что получаем правильный ID голоса
      if (!voiceCode.includes("_24000")) {
        console.error("Invalid voice ID format:", voiceCode);
        throw new Error("Invalid voice ID format");
      }

      // Теперь обновляем настройки голоса с преобразованным кодом
      const updatedSettings = await this.prisma.voiceSettings.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          voiceId: voiceCode,
          speed: data.settings.speed,
          pitch: 1.0,
        },
        update: {
          voiceId: voiceCode,
          speed: data.settings.speed,
          pitch: 1.0,
        },
      });
      console.log("Settings saved to database:", updatedSettings);

      const voicePrefix = voiceCode.split("_")[0];
      const voiceName = this.VOICE_INFO[voicePrefix]?.name || voiceCode;
      const voiceGender = this.VOICE_INFO[voicePrefix]?.gender === "female" ? "женский" : "мужской";

      const message =
        `✅ Настройки голоса обновлены!\n\n` +
        `🎤 Выбранный голос: ${voiceName} (${voiceGender})\n` +
        `⚡️ Скорость: ${data.settings.speed}x\n\n` +
        `Отправьте текст, который хотите озвучить.`;

      console.log("Sending message to Telegram:", message);
      await this.telegramService.sendMessage(data.userId, message);
      console.log("Message sent successfully");

      return { success: true, settings: updatedSettings };
    } catch (error) {
      console.error("Error in updateSettings:", error);
      throw error;
    }
  }
}
