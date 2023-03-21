import { UserEventType } from "../userEventType";
import { User } from "./user";
import { UserEvent } from "./userEvent"

export class OnFollowEvent extends UserEvent {
  constructor(
    user: User
  ) {
    super(user, UserEventType.Follow)
   }
   event: {}
}