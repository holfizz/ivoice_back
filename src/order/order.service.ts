import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { TelegramService } from "../telegram/telegram.service";

@Injectable()
export class OrderService {
  private readonly providerToken: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private telegramService: TelegramService,
  ) {
    this.providerToken = this.configService.get("TELEGRAM_PROVIDER_TOKEN");
  }

  async createOrder(userId: string, amount: number) {
    return this.prisma.order.create({
      data: {
        userId,
        amount,
        status: OrderStatus.PENDING,
      },
    });
  }

  async getOrder(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async handleWebhook(payload: any) {
    try {
      console.log("Webhook received:", payload);

      if (payload.event === "payment.succeeded") {
        const orderId = payload.object.description.split("#")[1];

        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID },
        });

        const order = await this.getOrder(orderId);
        if (order) {
          const user = await this.prisma.user.findUnique({
            where: { id: order.userId },
          });

          if (user) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { balance: user.balance + order.amount },
            });

            await this.telegramService.sendMessage(user.telegram_id, `✅ Оплата успешно получена!\n\n💰 Баланс пополнен на ${order.amount} руб.`);
          }
        }

        return { success: true };
      }

      return { success: true };
    } catch (error) {
      console.error("Webhook handling error:", error);
      throw new BadRequestException(error.message);
    }
  }

  async saveUserEmail(chatId: string, email: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegram_id: chatId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { email },
    });

    return user;
  }

  async createPaymentInvoice(chatId: string, amount: number) {
    const user = await this.prisma.user.findFirst({
      where: { telegram_id: chatId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (!user.email) {
      throw new BadRequestException("EMAIL_REQUIRED");
    }

    if (amount < 85) {
      throw new BadRequestException("Минимальная сумма пополнения - 85 ₽");
    }

    const order = await this.createOrder(user.id, amount);

    // Сумма в копейках для prices (целое положительное число)
    const amountInKopeks = Math.round(amount * 100);

    const prices = [
      {
        label: "Пополнение баланса",
        amount: amountInKopeks,
      },
    ];

    const providerData = {
      receipt: {
        items: [
          {
            description: "Пополнение баланса",
            quantity: "1",
            amount: {
              value: (amountInKopeks / 100).toFixed(2),
              currency: "RUB",
            },
            vat_code: 1,
          },
        ],
        customer: {
          email: user.email,
        },
      },
    };

    console.log("Debug payment data:");
    console.log("Amount in kopeks:", amountInKopeks);
    console.log("Prices array:", JSON.stringify(prices, null, 2));
    console.log("Provider data:", JSON.stringify(providerData, null, 2));

    return {
      chat_id: chatId,
      title: "Пополнение баланса",
      description: `Пополнение баланса на ${amount} руб.`,
      payload: `order_${order.id}`,
      provider_token: this.providerToken,
      currency: "RUB",
      prices,
      need_email: false,
      send_email_to_provider: true,
      provider_data: JSON.stringify(providerData),
    };
  }

  async handlePaymentSuccess(payload: any) {
    const orderId = payload.invoice_payload.replace("order_", "");

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paymentId: payload.provider_payment_charge_id,
      },
    });

    const order = await this.getOrder(orderId);
    if (order) {
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
      });

      if (user) {
        const newBalance = user.balance + order.amount;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { balance: newBalance },
        });

        await this.telegramService.sendMessage(
          user.telegram_id,
          `✅ Оплата успешно получена!

💰 Пополнение: ${order.amount.toFixed(2)} ₽
💳 Текущий баланс: ${newBalance.toFixed(2)} ₽

🎯 Что дальше:
1️⃣ Отправьте команду /settings чтобы настроить голос
2️⃣ После настройки просто отправьте текст для озвучки
3️⃣ Бот сгенерирует аудио с выбранным голосом`,
        );
      }
    }
  }
}
