import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class UserInput {
  @IsEmail(
    {},
    {
      message: "email must be an email",
    },
  )
  @Field(type => String)
  email: string;

  @MinLength(6, {
    message: "Password must be at least 6 characters long",
  })
  @IsString()
  @Field(type => String)
  password: string;
}
