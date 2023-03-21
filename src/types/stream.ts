import { Field, PrimaryKey, TigrisCollection, TigrisDataTypes } from "@tigrisdata/core";

@TigrisCollection("streams")
export class Stream {
  @PrimaryKey(TigrisDataTypes.STRING, { order: 1 })
  streamDate: string;

  @Field(TigrisDataTypes.STRING)
  started_at: string;

  @Field(TigrisDataTypes.STRING)
  ended_at?: string;

  @Field(TigrisDataTypes.STRING)
  title: string;
}