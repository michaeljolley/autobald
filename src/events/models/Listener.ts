import { BotEvents } from "../../botEvents";

export class Listener<T> {
  constructor(
    public type: BotEvents,
    public listener: (arg: T) => void
  ) { }
}