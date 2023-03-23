import { EventBus } from "../events";
import { BotEvents } from "../botEvents";
import { log, LogLevel } from "../log";
import { Tigris } from "../integrations/tigris"
import { Twitch } from "../integrations/twitch";
import { Credit, OnCreditRollEvent } from "../types";
import { UserEventType } from "../userEventType";

export class Engine {
    constructor() {
        EventBus.eventEmitter.addListener(
            BotEvents.RequestCreditRoll, 
            (streamDate: string) => this.buildCreditRoll(streamDate))
    }

    private async buildCreditRoll(streamDate: string) {
        log(LogLevel.Info, "Building Credits")

        const stream = await Tigris.getStream(streamDate)

        if (stream) {

            const activities = await Tigris.getActivitiesByStream(streamDate)

            const userIds = new Set(activities.map(m => m.userId))

            const credits: Credit[] = [];

            for (const userId of userIds) {

                const user = await Twitch.getUser(parseInt(userId))

                let tier = 0;
                if (
                    activities.some(f => 
                        f.userId === userId &&
                        f.event === UserEventType.Raid)) {
                            tier = 1;
                        }
                if (activities.some(f => 
                    f.userId === userId &&
                    f.event === UserEventType.Cheer)) {
                        tier = 2;
                    }
              
                if (activities.some(f => 
                    f.userId === userId &&
                    f.event === UserEventType.Sub)) {
                        tier = 3;
                    }

                if (user) {
                    credits.push(new Credit(
                        user.display_name, 
                        user.avatar_url,
                        activities.some(f => 
                                f.userId === user.id &&
                                f.event === UserEventType.Cheer),
                        activities.some(f => 
                                f.userId === user.id &&
                                f.event === UserEventType.Sub),
                        false,
                        activities.some(f => 
                                f.userId === user.id &&
                                f.event === UserEventType.Raid))),
                        tier
                }
            }

            this.emit(BotEvents.OnCreditRoll, new OnCreditRollEvent(credits))
        }
    }

    private emit(event: BotEvents, payload: unknown) {
        EventBus.eventEmitter.emit(event, payload)
    }
}



