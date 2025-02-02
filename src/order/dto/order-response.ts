import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class OrderResponse {
  @Field(() => String)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  paymentId: string;

  @Field(() => Number)
  amount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
