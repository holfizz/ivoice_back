import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderStatus } from "@prisma/client";
import { CurrencyEnum } from "yookassa-ts/lib/types/Common";
import { PaymentStatusEnum } from "yookassa-ts/lib/types/Payment";
import YooKassa from "yookassa-ts/lib/yookassa";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PaymentService {
  private readonly yooKassa: YooKassa;
  private readonly returnUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    this.yooKassa = new YooKassa({
      shopId,
      secretKey,
    });
    this.returnUrl = "https://t.me/your_muse_bot";
  }

  async createPayment(orderId: string, email: string, price = 4990) {
    try {
      // Check if there's an existing valid payment
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { paymentId: true, paymentUrl: true },
      });

      if (existingOrder?.paymentId && existingOrder?.paymentUrl) {
        // Verify if the payment is still valid
        try {
          const existingPayment = await this.yooKassa.getPayment(existingOrder.paymentId);
          if (existingPayment.status !== PaymentStatusEnum.CANCELED) {
            return {
              id: existingOrder.paymentId,
              confirmationUrl: existingOrder.paymentUrl,
            };
          }
        } catch (error) {
          console.log("Existing payment not valid, creating new one");
        }
      }

      const payment = await this.yooKassa.createPayment({
        amount: {
          value: price.toFixed(2).toString(),
          currency: CurrencyEnum.RUB,
        },
        capture: true,
        //@ts-ignore
        confirmation: {
          type: "redirect",
          return_url: this.returnUrl,
        },
        description: `Order #${orderId}`,
        receipt: {
          customer: {
            email: email,
          },
          items: [
            {
              description: "Фотоальбом Art Vision",
              quantity: "1",
              amount: {
                value: "4990.00",
                currency: CurrencyEnum.RUB,
              },
              vat_code: 1,
            },
          ],
        },
      });

      // Сохраняем URL для оплаты
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentId: payment.id,
          paymentUrl: payment.confirmationUrl,
        },
      });

      return payment;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  }

  async handleWebhook(payload: any) {
    try {
      console.log("Webhook received:", payload);

      if (payload.event === "payment.succeeded") {
        const orderId = payload.object.description.split("#")[1];
        console.log("Processing payment for order:", orderId);

        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.PAID },
        });

        return { success: true, orderId };
      }

      return { success: true };
    } catch (error) {
      console.error("Webhook handling error:", error);
      throw error;
    }
  }
}
