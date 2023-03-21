import { Field, TigrisCollection, TigrisDataTypes } from "@tigrisdata/core";
import { UserEvent } from "./userEvent";
import { UserEventType } from "../userEventType";

@TigrisCollection("activities")
export class Activity {
    constructor(userEvent: UserEvent) {
        this.userId = userEvent.user.id
        this.type = userEvent.type
        this.event = userEvent.event
    }
    
  @Field(TigrisDataTypes.DATE_TIME, { timestamp: 'createdAt' })
  createdAt: Date

  @Field(TigrisDataTypes.STRING)
  userId: string

  @Field(TigrisDataTypes.STRING)
  type: UserEventType
  
  @Field(TigrisDataTypes.OBJECT)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any
}
