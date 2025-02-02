import { Field, InputType, PartialType } from "@nestjs/graphql";
import { IsString } from "class-validator";
import { SignUpInput } from "./auth.input";

@InputType()
export class UpdateAuthInput extends PartialType(SignUpInput) {
  @Field({ nullable: true })
  @IsString()
  avatarPath?: string;
}
