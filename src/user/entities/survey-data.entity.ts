import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SurveyData {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  weight: number;

  @Field(() => Int)
  height: number;

  @Field(() => Int)
  age: number;

  @Field()
  gender: string;

  @Field()
  updatedAt: Date;
}
