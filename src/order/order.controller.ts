import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { OrderService } from "./order.service";

@Controller("webhook")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post("payment-notification")
  @HttpCode(200)
  async handlePaymentNotification(@Body() payload: any) {
    return this.orderService.handleWebhook(payload);
  }
}
