import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SurveyDataObject {
  @Field(() => String)
  id: string;

  @Field(() => Int)
  weight: number;

  @Field(() => Int)
  height: number;

  @Field(() => Int)
  age: number;

  @Field(() => String)
  gender: string;

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
