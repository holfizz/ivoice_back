import { Field, InputType, ObjectType } from "@nestjs/graphql";
import { IsString } from "class-validator";
@InputType()
export class RefreshTokenInput {
  @IsString()
  @Field(() => String)
  refreshToken: string;
}
@ObjectType()
export class AuthUser {
  @Field(() => String)
  email: string;

  @Field(() => [String])
  roles: string[];
}
@ObjectType()
export class RefreshTokenResponse {
  @Field(() => String)
  accessToken: string;

  @Field(() => AuthUser)
  user: AuthUser;
}
