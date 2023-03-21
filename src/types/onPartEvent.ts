import { UserEventType } from "../userEventType";
import { User } from "./user";
import { UserEvent } from "./userEvent"

export class OnPartEvent extends UserEvent {
  constructor(
    user: User,
    public self: boolean
  ) { 
    super(user, UserEventType.Part)
  }

  event: {}
}