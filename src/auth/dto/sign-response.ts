import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class AuthUserResponse {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;
}

@ObjectType()
export class SignResponse {
  @Field(() => AuthUserResponse)
  user: AuthUserResponse;

  @Field(() => String)
  accessToken: string;
}
