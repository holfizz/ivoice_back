import { BaseEntity } from "@/helpers/base.entity";
import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SurveyData {
  @Field(() => String)
  id: string;

  @Field(() => String)
  gender: string;

  @Field(() => Int)
  weight: number;

  @Field(() => Int)
  height: number;

  @Field(() => Int)
  age: number;

  @Field(() => String)
  workoutsPerWeek: string;

  @Field(() => Boolean)
  usedOtherApps: boolean;

  @Field(() => Float)
  calorieGoal: number;

  @Field(() => Float)
  proteinsGoal: number;

  @Field(() => Float)
  fatsGoal: number;

  @Field(() => Float)
  carbsGoal: number;
}

@ObjectType()
export class User extends BaseEntity {
  @Field()
  email: string;

  @Field(() => SurveyData, { nullable: true })
  surveyData?: SurveyData;

  @Field(() => Float, { defaultValue: 2000 })
  dailyCaloriesGoal: number = 2000;

  @Field(() => Float, { defaultValue: 75 })
  dailyProteinsGoal: number = 75;

  @Field(() => Float, { defaultValue: 60 })
  dailyFatsGoal: number = 60;

  @Field(() => Float, { defaultValue: 250 })
  dailyCarbsGoal: number = 250;
}
