import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class OrderModel {
  @Field()
  id: string;

  @Field()
  amount: number;

  @Field()
  status: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  paymentId?: string;
}
