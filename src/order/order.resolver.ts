import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { OrderService } from "./order.service";

@Resolver()
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => String)
  hello() {
    return "Hello World!";
  }

  @Mutation(() => Boolean)
  async createOrder(@Args("userId") userId: string, @Args("amount") amount: number) {
    await this.orderService.createOrder(userId, amount);
    return true;
  }

  // @Query(() => [OrderResponse])
  // @UseGuards(JwtAuthGuard)
  // async getUserOrders(@Context() context: any) {
  //   const userId = context.req.user.id;
  //   return this.orderService.getUserOrders(userId);
  // }
}
