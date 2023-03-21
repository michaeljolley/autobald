import { User } from "./user"
import { UserEvent } from "./userEvent"
import { UserEventType } from "../userEventType"

export class OnRaidEvent extends UserEvent {
  constructor(
    user: User,
    public viewers: number
  ) {
    super(user, UserEventType.Raid)
    this.event = {
      viewers
    }
   }

   event: {
    viewers: number
   }
}