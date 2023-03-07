import {
  Field,
  PrimaryKey,
  TigrisCollection,
  TigrisDataTypes,
} from "@tigrisdata/core";

@TigrisCollection("users")
export class User {
  @PrimaryKey(TigrisDataTypes.STRING, { order: 1 })
  id: string;

  @Field(TigrisDataTypes.STRING)
  login: string;

  @Field(TigrisDataTypes.STRING)
  avatar_url: string;

  @Field(TigrisDataTypes.STRING)
  display_name?: string;

  @Field(TigrisDataTypes.DATE_TIME)
  lastUpdated?: Date;
}