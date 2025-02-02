import { Field, Float, InputType, Int, ObjectType } from "@nestjs/graphql";
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";

@InputType("SurveyDataInput")
export class SurveyDataInput {
  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  height?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  age?: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  gender?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  workoutsPerWeek?: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  usedOtherApps?: boolean;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  calorieGoal?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  proteinsGoal?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  fatsGoal?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  carbsGoal?: number;
}

@ObjectType()
export class User {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => [String])
  roles: string[];

  @Field(() => SurveyDataInput, { nullable: true })
  surveyData?: SurveyDataInput;
}

@InputType()
export class SignUpInput {
  @IsEmail({}, { message: "email must be an email" })
  @IsNotEmpty()
  @Field(() => String)
  email: string;

  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @IsString()
  @IsNotEmpty()
  @Field(() => String)
  password: string;

  @Field(() => SurveyDataInput, { nullable: true })
  @IsOptional()
  surveyData?: SurveyDataInput;
}

@InputType()
export class ResetPasswordInput {
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  @IsString()
  @IsNotEmpty()
  @Field(() => String)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Field(() => String)
  token: string;
}

@InputType()
export class ActivationLinkInput {
  @IsString()
  @IsNotEmpty()
  @Field(() => String)
  activationLink: string;
}

@InputType()
export class RequestEmailCodeInput {
  @IsEmail({}, { message: "email must be an email" })
  @IsNotEmpty()
  @Field(() => String)
  email: string;
}

@InputType()
export class VerifyEmailCodeInput {
  @IsEmail({}, { message: "email must be an email" })
  @IsNotEmpty()
  @Field(() => String)
  email: string;

  @IsString()
  @IsNotEmpty()
  @Field(() => String)
  code: string;
}
