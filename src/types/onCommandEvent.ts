import { User } from "./user";
import { OnCommandExtra, OnMessageFlags } from "comfy.js";
import { IUserEvent } from "./IUserEvent"

export class OnCommandEvent implements IUserEvent {
  constructor(
    public user: User,
    public command: string,
    public message: string,
    public flags: OnMessageFlags,
    public extra: OnCommandExtra
  ) { }
}