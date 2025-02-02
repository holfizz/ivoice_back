import { Field, ID, InputType, PartialType } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { UserInput } from "./user.input";

@InputType()
export class UpdateUserInput extends PartialType(UserInput) {
  @Field(() => ID, { nullable: true })
  @IsUUID()
  @IsOptional()
  id?: string;
  @IsEmail(
    {},
    {
      message: "email must be an email",
    },
  )
  @Field(type => String, { nullable: true })
  @IsOptional()
  email?: string;

  @MinLength(6, {
    message: "Password must be at least 6 characters long",
  })
  @IsString()
  @Field(type => String, { nullable: true })
  @IsOptional()
  password?: string;
}
