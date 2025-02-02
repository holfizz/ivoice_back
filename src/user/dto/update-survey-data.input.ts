import { Field, InputType, Int } from "@nestjs/graphql";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

enum Gender {
  MALE = "male",
  FEMALE = "female",
}

@InputType()
export class UpdateSurveyDataInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  weight?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  height?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(100)
  age?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
