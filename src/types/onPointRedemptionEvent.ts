import { User } from "./user";
import { OnMessageExtra, OnMessageFlags } from "comfy.js";
import { UserEvent } from "./userEvent"
import { UserEventType } from "../userEventType";

export class OnPointRedemptionEvent extends UserEvent {
  constructor(
    user: User,
    message: string,
    public flags: OnMessageFlags,
    public self: boolean,
    public extra: OnMessageExtra
  ) { 
    super(user, UserEventType.PointRedemption)
    this.event = {message}
  }

  event: {
    message: string
  }
}