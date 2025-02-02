import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
class Amount {
  @Field(() => String)
  value: string;

  @Field(() => String)
  currency: string;
}

@ObjectType()
class Confirmation {
  @Field(() => String)
  type: string;

  @Field(() => String)
  confirmation_url: string;

  @Field(() => String, { nullable: true })
  return_url?: string;
}

@ObjectType()
class PaymentMethod {
  @Field(() => String)
  type: string;

  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => Boolean, { nullable: true })
  saved?: boolean;
}

@ObjectType()
class Recipient {
  @Field(() => String)
  account_id: string;

  @Field(() => String)
  gateway_id: string;
}

@ObjectType()
export class PaymentResponse {
  @Field(() => String)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => Amount)
  amount: Amount;

  @Field(() => String)
  description: string;

  @Field(() => Recipient)
  recipient: Recipient;

  @Field(() => String)
  created_at: string;

  @Field(() => Confirmation)
  confirmation: Confirmation;

  @Field(() => PaymentMethod, { nullable: true })
  payment_method?: PaymentMethod;

  @Field(() => Boolean)
  test: boolean;

  @Field(() => Boolean)
  paid: boolean;

  @Field(() => Boolean)
  refundable: boolean;

  @Field(() => Boolean, { nullable: true })
  captured?: boolean;
}
