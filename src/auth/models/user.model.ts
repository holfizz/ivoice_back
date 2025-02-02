import { Field, ObjectType } from "@nestjs/graphql";
import { SurveyDataObject } from "./survey-data.model";

@ObjectType()
export class BaseUser {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => Number)
  dailyCaloriesGoal: number;

  @Field(() => Number)
  dailyProteinsGoal: number;

  @Field(() => Number)
  dailyFatsGoal: number;

  @Field(() => Number)
  dailyCarbsGoal: number;

  @Field(() => [String])
  roles: string[];

  @Field(() => String)
  updatedAt: string;

  @Field(() => SurveyDataObject, { nullable: true })
  surveyData?: SurveyDataObject;

  @Field(() => String, { nullable: true })
  resetPasswordToken?: string;

  @Field(() => Date, { nullable: true })
  resetPasswordExpiration?: Date;
}
