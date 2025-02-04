import { PrismaService } from "@/prisma.service";
import { Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Command, Ctx, Help, Message, On, Start, Update } from "nestjs-telegraf";
import { Context } from "telegraf";
import { SYMBOL_PRICE } from "../constants";
import { OrderService } from "../order/order.service";
import { TelegramService } from "./telegram.service";

const DEMO_TEXT = "Привет! Это пример озвучки текста с помощью нейросети.";

@Update()
export class TelegramUpdate {
  private userStates: Map<string, { action: string; amount?: number }> = new Map();

  constructor(
    private telegramService: TelegramService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private async handleCommand(chatId: string, text: string) {
    await this.telegramService.handleCommand(chatId, text);
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    try {
      if (!ctx.from) return;
      const telegramId = ctx.from.id.toString();
      const chatId = ctx.chat?.id.toString();
      if (!chatId) return;

      await this.telegramService.handleStart(telegramId, chatId);
    } catch (error) {
      console.error("Ошибка при обработке команды /start:", error);
      await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
    }
  }

  @Help()
  async help(@Ctx() ctx: Context) {
    try {
      const chatId = ctx.chat?.id.toString();
      if (!chatId) return;

      await this.telegramService.sendMessage(
        chatId,
        `🎯 Как пользоваться ботом:

1️⃣ Просто отправьте текст, который хотите озвучить
2️⃣ Бот сгенерирует аудио с выбранным голосом
3️⃣ Используйте /settings для настройки голоса

💰 Стоимость: 0.01 руб. за символ
🎁 Пробный баланс: 10 руб.

⚙️ Команды:
/settings - настройки голоса
/balance - пополнить баланс
/help - это сообщение`,
      );
    } catch (error) {
      console.error("Ошибка при обработке команды /help:", error);
      await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
    }
  }

  @On("text")
  async onText(@Ctx() ctx: Context) {
    try {
      if (!ctx.message || !("text" in ctx.message)) return;
      const chatId = ctx.chat?.id.toString();
      if (!chatId) return;

      const text = ctx.message.text;
      const userState = this.userStates.get(chatId);

      if (userState?.action === "WAITING_EMAIL") {
        const email = text.trim();
        if (!email.includes("@") || !email.includes(".")) {
          await this.telegramService.sendMessage(chatId, "❌ Пожалуйста, введите корректный email адрес");
          return;
        }

        await this.prisma.user.update({
          where: { telegram_id: chatId },
          data: { email },
        });

        if (userState.amount) {
          const invoice = await this.orderService.createPaymentInvoice(chatId, userState.amount);
          await ctx.replyWithInvoice(invoice);
        }

        this.userStates.delete(chatId);
        return;
      }

      if (userState?.action === "WAITING_AMOUNT") {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount < 85) {
          await this.telegramService.sendMessage(chatId, "❌ Пожалуйста, введите сумму не менее 85 ₽");
          return;
        }

        if (amount > 25000) {
          await this.telegramService.sendMessage(chatId, "❌ Максимальная сумма пополнения - 25 000 ₽");
          return;
        }

        const user = await this.prisma.user.findFirst({
          where: { telegram_id: chatId },
          select: { email: true },
        });

        if (user?.email) {
          const invoice = await this.orderService.createPaymentInvoice(chatId, amount);
          await ctx.replyWithInvoice(invoice);
          this.userStates.delete(chatId);
        } else {
          this.userStates.set(chatId, { action: "WAITING_EMAIL", amount });
          await this.telegramService.sendMessage(chatId, "📧 Пожалуйста, отправьте ваш email для получения чека:");
        }

        return;
      }

      switch (text) {
        case "💳 Пополнить баланс":
          await this.handleCommand(chatId, "/balance");
          break;
        case "ℹ️ Помощь":
          await this.handleCommand(chatId, "/help");
          break;
        default:
          if (text.startsWith("/")) {
            await this.handleCommand(chatId, text);
          } else {
            await this.telegramService.handleText(chatId, text);
          }
      }
    } catch (error) {
      console.error("Error handling text message:", error);
    }
  }

  @On("pre_checkout_query")
  async onPreCheckoutQuery(@Ctx() ctx: Context) {
    try {
      if (!ctx.preCheckoutQuery) return;

      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error("Error in pre_checkout_query:", error);
      await ctx.answerPreCheckoutQuery(false, "Ошибка при обработке платежа");
    }
  }

  @On("successful_payment")
  async onSuccessfulPayment(@Ctx() ctx: Context) {
    try {
      if (!ctx.message || !("successful_payment" in ctx.message)) return;

      await this.orderService.handlePaymentSuccess(ctx.message.successful_payment);
    } catch (error) {
      console.error("Error in successful_payment:", error);
    }
  }

  @Command("balance")
  async onBalance(@Ctx() ctx: Context) {
    try {
      if (!ctx.message) return;
      const chatId = ctx.message.chat.id.toString();

      const keyboard = {
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

      await this.telegramService.sendMessageWithKeyboard(
        chatId,
        `💰 Выберите сумму пополнения:

💡 Стоимость озвучки: ${SYMBOL_PRICE} ₽/символ
💳 Ваш баланс: ${await this.telegramService.getUserBalance(chatId)} ₽

ℹ️ Минимальная сумма пополнения - 85 ₽`,
        keyboard,
      );
    } catch (error) {
      console.error("Error in balance command:", error);
    }
  }

  @On("callback_query")
  async handleCallback(@Ctx() ctx: Context) {
    try {
      const callback = ctx.callbackQuery;
      const data = callback && "data" in callback ? callback.data : undefined;
      const chatId = callback?.from?.id?.toString();

      if (!chatId || !data) return;

      if (data === "custom_amount") {
        this.userStates.set(chatId, { action: "WAITING_AMOUNT" });
        await this.telegramService.sendMessage(chatId, "💰 Введите сумму пополнения в рублях (минимум 85 ₽):");
        await ctx.answerCbQuery();
        return;
      }

      if (data.startsWith("add_balance_")) {
        const amount = parseInt(data.replace("add_balance_", ""));

        const user = await this.prisma.user.findFirst({
          where: { telegram_id: chatId },
          select: { email: true },
        });

        if (user?.email) {
          const invoice = await this.orderService.createPaymentInvoice(chatId, amount);
          await ctx.replyWithInvoice(invoice);
          this.userStates.delete(chatId);
        } else {
          this.userStates.set(chatId, { action: "WAITING_EMAIL", amount });
          await this.telegramService.sendMessage(chatId, "📧 Пожалуйста, отправьте ваш email для получения чека:");
        }
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in handleCallback:", error);
    }
  }

  @On("web_app_data")
  async onWebAppData(@Message() message: any) {
    console.log("Backend: Received web_app_data event");
    console.log("Backend: Raw message:", message);

    try {
      const data = JSON.parse(message.web_app_data.data);
      console.log("Backend: Parsed data:", data);

      const chatId = message.chat.id.toString();
      console.log("Backend: Chat ID:", chatId);

      if (data.type === "settings_updated") {
        console.log("Backend: Processing settings update");

        // 1. Сохраняем настройки в базу данных
        const updatedSettings = await this.prisma.voiceSettings.upsert({
          where: {
            userId: chatId,
          },
          create: {
            userId: chatId,
            voiceId: data.settings.voiceId,
            speed: data.settings.speed,
            pitch: data.settings.pitch,
          },
          update: {
            voiceId: data.settings.voiceId,
            speed: data.settings.speed,
            pitch: data.settings.pitch,
          },
        });
        console.log("Backend: Settings saved:", updatedSettings);

        // 2. Получаем информацию о выбранном голосе
        const voiceName = await this.getVoiceName(data.settings.voiceId);
        console.log("Backend: Voice name:", voiceName);

        // 3. Отправляем сообщение пользователю
        const message =
          `✅ Настройки голоса обновлены!\n\n` +
          `🎤 Выбранный голос: ${voiceName}\n` +
          `⚡️ Скорость: ${data.settings.speed}x\n` +
          `🎵 Высота: ${data.settings.pitch}x\n\n` +
          `Отправьте текст, который хотите озвучить.`;

        console.log("Backend: Sending message:", message);
        await this.telegramService.sendMessage(chatId, message);
        console.log("Backend: Message sent successfully");
      }
    } catch (error) {
      console.error("Backend: Error handling web app data:", error);
      if (error.response) {
        console.error("Backend: Error response:", error.response.data);
      }
    }
  }

  // Вспомогательная функция для получения имени голоса
  private getVoiceName(voiceId: string): string {
    const voices = {
      Nec_24000: "Наталья",
      Bys_24000: "Борис",
      May_24000: "Марфа",
      Tur_24000: "Тарас",
      Ost_24000: "Александра",
      Pon_24000: "Сергей",
    };
    return voices[voiceId] || voiceId;
  }

  @Command("demo")
  async onDemo(@Ctx() ctx: Context) {
    try {
      if (!ctx.message) return;
      const chatId = ctx.message.chat.id.toString();

      const user = await this.prisma.user.findFirst({
        where: { telegram_id: chatId },
        include: { voiceSettings: true },
      });

      if (!user) return;

      const audioBuffer = await this.telegramService.generateVoice(DEMO_TEXT, user.voiceSettings);
      await this.telegramService.sendVoice(chatId, audioBuffer, {
        caption: "🎯 Это пример озвучки текста. Попробуйте отправить свой текст!",
      });
    } catch (error) {
      console.error("Error in demo command:", error);
    }
  }

  @Command("payment")
  async onPayment(@Ctx() ctx: Context) {
    try {
      if (!ctx.message) return;
      const chatId = ctx.message.chat.id.toString();

      const keyboard = {
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

      await this.telegramService.sendMessageWithKeyboard(
        chatId,
        `💰 Выберите сумму пополнения:

💡 Стоимость озвучки: ${SYMBOL_PRICE} ₽/символ
💳 Ваш баланс: ${await this.telegramService.getUserBalance(chatId)} ₽

ℹ️ Минимальная сумма пополнения - 85 ₽`,
        keyboard,
      );
    } catch (error) {
      console.error("Error in payment command:", error);
    }
  }

  @Command("help")
  async onHelpCommand(@Ctx() ctx: Context) {
    try {
      const chatId = ctx.chat?.id.toString();
      if (!chatId) return;

      const helpUser = await this.getUserSettings(chatId);
      await this.telegramService.sendMessage(
        chatId,
        `🎯 Как пользоваться ботом:

1️⃣ Просто отправьте текст, который хотите озвучить
2️⃣ Бот сгенерирует аудио с выбранным голосом
3️⃣ Нажмите кнопку "Настройки" для выбора голоса

💰 Стоимость: ${SYMBOL_PRICE} руб. за символ
💳 Ваш баланс: ${helpUser.balance.toFixed(2)} руб.`,
      );
    } catch (error) {
      console.error("Error in help command:", error);
      await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
    }
  }

  @Command("settings")
  async onSettingsCommand(@Ctx() ctx: Context) {
    try {
      if (!ctx.message) return;
      const chatId = ctx.message.chat.id.toString();

      // Формируем URL для веб-приложения с userId в пути
      const webAppUrl = `${this.configService.get<string>("WEBAPP_URL")}${chatId}`;

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

      await this.telegramService.sendMessageWithKeyboard(chatId, "Нажмите кнопку ниже, чтобы открыть настройки голоса:", settingsKeyboard);
    } catch (error) {
      console.error("Error in settings command:", error);
      await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
    }
  }

  private async getUserSettings(chatId: string) {
    return await this.prisma.user.findFirstOrThrow({
      where: { telegram_id: chatId },
      include: { voiceSettings: true },
    });
  }
}
