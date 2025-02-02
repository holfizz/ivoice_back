import { PrismaService } from "@/prisma.service";
import { VoiceService } from "@/voice/voice.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User, VoiceSettings } from "@prisma/client";
import { InjectBot } from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { SYMBOL_PRICE } from "../constants";
import { TelegramServiceClient } from "./telegram.service.client";

interface VoiceSettingsUpdate {
  voiceId: string;
  speed: number;
  pitch?: number;
  volume?: number;
}

@Injectable()
export class TelegramService {
  private availableVoices = {
    ru: [
      { id: "Nec_24000", name: "Наталья", preview: "assets/natalya.wav" },
      // Остальные голоса можно закомментировать пока
      // { id: "Bys_24000", name: "Борис" },
      // { id: "May_24000", name: "Марфа" },
    ],
    en: [
      // { id: "alex", name: "Alex" },
      // { id: "emma", name: "Emma" },
    ],
  };

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly prisma: PrismaService,
    private telegramClient: TelegramServiceClient,
    private configService: ConfigService,
    private voiceService: VoiceService,
  ) {}

  async handleStart(telegramId: string, chatId: string) {
    try {
      let user = await this.prisma.user.findFirst({
        where: { telegram_id: telegramId },
        include: { voiceSettings: true },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            telegram_id: telegramId,
            state: "INITIAL",
            voiceSettings: {
              create: {
                voiceId: "Nec_24000",
                speed: 1.0,
                pitch: 1.0,
              },
            },
          },
          include: { voiceSettings: true },
        });
      }

      const webAppUrl = `${this.configService.get<string>("WEBAPP_URL")}?userId=${telegramId}`;
      const keyboard = {
        keyboard: [
          [
            {
              text: "⚙️ Настройки голоса",
              web_app: { url: webAppUrl },
            },
          ],
          [{ text: "💳 Пополнить баланс" }],
          [{ text: "ℹ️ Помощь" }],
        ],
        resize_keyboard: true,
        persistent: true,
      };

      await this.sendMessageWithKeyboard(
        chatId,
        `👋 ${user ? "С возвращением!" : "Добро пожаловать в Text2Voice Bot!"}

🎯 Я помогу озвучить любой текст приятным голосом.

💰 На вашем балансе: ${user.balance.toFixed(2)} ₽
💵 Стоимость: ${SYMBOL_PRICE} ₽ за символ

Просто отправьте мне текст, и я его озвучу!`,
        keyboard,
      );
    } catch (error) {
      console.error("Error in handleStart:", error);
      throw error;
    }
  }

  async handleText(chatId: string, text: string) {
    try {
      // Получаем пользователя с его настройками голоса
      const user = await this.prisma.user.findFirst({
        where: { telegram_id: chatId },
        include: { voiceSettings: true },
      });

      if (!user) {
        console.log("User not found:", chatId);
        return;
      }

      console.log("=== TelegramService: Processing text ===");
      console.log("User:", user.telegram_id);
      console.log("Voice settings:", user.voiceSettings);
      console.log("Text to process:", text);

      if (!user.voiceSettings) {
        // Создаем настройки по умолчанию, если их нет
        await this.prisma.voiceSettings.create({
          data: {
            userId: user.id,
            voiceId: "Nec_24000",
            speed: 1.0,
            pitch: 1.0,
          },
        });
        return this.handleText(chatId, text);
      }

      const cost = text.length * SYMBOL_PRICE;

      if (user.balance < cost) {
        await this.sendMessage(chatId, `❌ Недостаточно средств\n\nСтоимость озвучки: ${cost} руб.\nВаш баланс: ${user.balance} руб.\n\nПополните баланс: /balance`);
        return;
      }

      // Используем актуальные настройки голоса
      console.log("Generating voice with settings:", user.voiceSettings);
      const audioBuffer = await this.voiceService.generateVoice(text, user.voiceSettings);

      await this.prisma.user.update({
        where: { telegram_id: chatId },
        data: { balance: user.balance - cost },
      });

      await this.telegramClient.sendVoice(chatId, audioBuffer, {
        caption: `🎯 Озвучено успешно!\n\n💰 Списано: ${cost} руб.\n💳 Остаток: ${(user.balance - cost).toFixed(2)} руб.`,
      });
    } catch (error) {
      console.error("Error handling text:", error);
      await this.sendMessage(chatId, "❌ Произошла ошибка при озвучке текста. Попробуйте позже.");
    }
  }

  private async getUserSettings(chatId: string): Promise<User & { voiceSettings: VoiceSettings | null }> {
    return await this.prisma.user.findFirstOrThrow({
      where: { telegram_id: chatId },
      include: { voiceSettings: true },
    });
  }

  async sendMessage(chatId: string, text: string): Promise<any> {
    console.log("TelegramService: Sending message");
    console.log("TelegramService: Chat ID:", chatId);
    console.log("TelegramService: Text:", text);

    try {
      const result = await this.bot.telegram.sendMessage(chatId, text);
      console.log("TelegramService: Message sent successfully:", result);
      return result;
    } catch (error) {
      console.error("TelegramService: Error sending message:", error);
      throw error;
    }
  }

  async sendMessageWithKeyboard(chatId: string, text: string, keyboard: any) {
    await this.telegramClient.sendMessageWithKeyboard(chatId, text, keyboard);
  }

  async handleCommand(chatId: string, text: string) {
    try {
      switch (text) {
        case "/settings": {
          const webAppUrl = this.configService.get<string>("WEBAPP_URL");
          const settingsKeyboard = {
            inline_keyboard: [
              [
                {
                  text: "⚙️ Открыть настройки",
                  web_app: { url: webAppUrl },
                },
              ],
            ],
          };

          await this.sendMessageWithKeyboard(chatId, "Нажмите кнопку ниже, чтобы открыть настройки:", settingsKeyboard);
          break;
        }
        case "/balance": {
          const user = await this.getUserSettings(chatId);
          const balanceKeyboard = {
            inline_keyboard: [
              [
                { text: "85 ₽", callback_data: "add_balance_85" },
                { text: "100 ₽", callback_data: "add_balance_100" },
                { text: "150 ₽", callback_data: "add_balance_150" },
              ],
              [
                { text: "200 ₽", callback_data: "add_balance_200" },
                { text: "500 ₽", callback_data: "add_balance_500" },
              ],
              [{ text: "💰 Своя сумма", callback_data: "custom_amount" }],
            ],
          };

          await this.sendMessageWithKeyboard(
            chatId,
            `💰 Выберите сумму пополнения:\n\n💡 Стоимость озвучки: ${SYMBOL_PRICE} ₽/символ\n💳 Ваш баланс: ${user.balance.toFixed(2)} ₽\n\nℹ️ Минимальная сумма пополнения - 85 ₽`,
            balanceKeyboard,
          );
          break;
        }
        case "/help":
          const helpUser = await this.getUserSettings(chatId);
          await this.sendMessage(
            chatId,
            `🎯 Как пользоваться ботом:

1️⃣ Просто отправьте текст, который хотите озвучить
2️⃣ Бот сгенерирует аудио с выбранным голосом
3️⃣ Нажмите кнопку "Настройки" для выбора голоса

💰 Стоимость: ${SYMBOL_PRICE} руб. за символ
💳 Ваш баланс: ${helpUser.balance.toFixed(2)} руб.`,
          );
          break;
        default:
          await this.sendMessage(chatId, "❌ Неизвестная команда");
      }
    } catch (error) {
      console.error("Error handling command:", error);
      throw error;
    }
  }

  async getUserBalance(chatId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { telegram_id: chatId },
      select: { balance: true },
    });

    return (user?.balance || 0).toFixed(2);
  }

  async updateVoiceSettings(chatId: string, settings: VoiceSettingsUpdate) {
    const user = await this.prisma.user.findFirst({
      where: { telegram_id: chatId },
      include: { voiceSettings: true },
    });

    if (!user) throw new Error("User not found");

    const voiceData = {
      voiceId: settings.voiceId || "Nec_24000",
      speed: settings.speed || 1.0,
    } as const;

    if (!user.voiceSettings) {
      // Если настройки не существуют, создаем их
      await this.prisma.voiceSettings.create({
        data: {
          ...voiceData,
          userId: user.id, // Используем ID пользователя
        },
      });
    } else {
      // Если настройки существуют, обновляем их
      await this.prisma.voiceSettings.update({
        where: { id: user.voiceSettings.id },
        data: voiceData,
      });
    }

    // Отправляем тестовое сообщение с новым голосом
    const testText = "Настройки голоса успешно обновлены!";
    const audioBuffer = await this.voiceService.generateVoice(testText, {
      ...user.voiceSettings,
      ...voiceData,
    });

    await this.telegramClient.sendVoice(chatId, audioBuffer, {
      caption: "✅ Настройки голоса успешно обновлены! Вот как звучит новый голос:",
    });
  }

  async generateVoice(text: string, settings: VoiceSettings) {
    return await this.voiceService.generateVoice(text, settings);
  }

  async sendVoice(chatId: string, buffer: Buffer, extra?: any) {
    return await this.telegramClient.sendVoice(chatId, buffer, extra);
  }
}
