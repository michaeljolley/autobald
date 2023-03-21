import { UserEventType } from "../userEventType";
import { User } from "./user";
import { UserEvent } from "./userEvent"

export class OnJoinEvent extends UserEvent {
  constructor(
    user: User,
    public self: boolean
  ) { 
    super(user, UserEventType.Join)
  }
  event: {}
}