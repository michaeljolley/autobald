import ComfyJS, { OnMessageFlags, OnMessageExtra, EmoteSet } from "comfy.js";
import sanitizeHtml from "sanitize-html";

import { Twitch } from '../integrations/twitch';
import { EventBus } from "../events";
import { AutoBaldConfig, User, OnChatMessageEvent } from "../types";
import { BotEvents } from "../botEvents";
import { log, LogLevel } from "../log";

export class Chat {

    constructor(private config: AutoBaldConfig) {
        ComfyJS.onChat = this.onChat.bind(this)

        ComfyJS.Init(this.config.twitchBotUsername, this.config.twitchBotAuthToken, this.config.twitchChannelName);
    }

    public close() {
        ComfyJS.Disconnect();
    }

    private async onChat(user: string, message: string, flags: OnMessageFlags, self: boolean, extra: OnMessageExtra) {
        log(LogLevel.Info, `onChat: ${user}: ${message}`)

        user = user.toLocaleLowerCase();

        if (!self
            && user !== process.env.TWITCH_BOT_USERNAME.toLocaleLowerCase()
            && user !== process.env.TWITCH_CHANNEL.toLocaleLowerCase()) {

            let userInfo: User;

            try {
                userInfo = await Twitch.getUser(user)
            }
            catch (err) {
                log(LogLevel.Error, `onChat: ${err}`)
            }

            if (userInfo) {
                const processedChat = this.processChat(message, flags, extra.messageEmotes);
                if (processedChat.message.length > 0) {
                    this.emit(BotEvents.OnChatMessage, new OnChatMessageEvent(userInfo, message, processedChat.message, flags, self, extra, extra.id, processedChat.emotes))
                }
            }
        }
    }

    private processChat(message: string, flags: OnMessageFlags, messageEmotes?: EmoteSet) {
        let tempMessage: string = message.replace(/<img/gi, '<DEL');

        const emotes = [];
        const theme = (flags.vip || flags.mod) ? "light" : "dark";

        // If the message has emotes, modify message to include img tags to the emote
        if (messageEmotes) {
            const emoteSet = [];

            for (const emote of Object.keys(messageEmotes)) {
                const emoteLocations = messageEmotes[emote];
                emoteLocations.forEach(location => {
                    emoteSet.push(this.generateEmote(emote, location, theme));
                });
            }

            // Order the emotes descending so we can iterate
            // through them with indexes
            emoteSet.sort((a, b) => {
                return b.end - a.end;
            });

            emoteSet.forEach(emote => {
                emotes.push(emote.emoteUrl);

                let emoteMessage = tempMessage.slice(0, emote.start);
                emoteMessage += emote.emoteImageTag;
                emoteMessage += tempMessage.slice(emote.end + 1, tempMessage.length);
                tempMessage = emoteMessage;
            });
        }

        tempMessage = sanitizeHtml(tempMessage, {
            allowedAttributes: {
                img: ['class',
                    'src']
            },
            allowedTags: [
                'marquee',
                'em',
                'strong',
                'b',
                'i',
                'code',
                'strike',
                'blink',
                'img',
                'h1',
                'h2',
                'h3',
            ]
        });

        tempMessage = tempMessage.replace(/@(\w*)/gm, `<span>$&</span>`);

        return { message: tempMessage, emotes: emotes.map(m => m.emoteImageTag as string) };
    }

    private generateEmote(emoteId: string, position: string, theme: string) {
        const [start, end] = position.split('-').map(Number);

        return {
            emoteId,
            emoteImageTag: `<img class='emote' src='https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/${theme}/1.0'/>`,
            emoteUrl: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/${theme}/1.0`,
            start,
            end
        };
    }

    private emit(event: BotEvents, payload: unknown) {
        EventBus.eventEmitter.emit(event, payload)
    }
}