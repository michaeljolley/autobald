import ComfyJS, { OnCommandExtra, OnMessageFlags, OnMessageExtra, EmoteSet, OnSubMysteryGiftExtra, OnSubGiftExtra, OnResubExtra, OnSubExtra, OnCheerFlags, OnCheerExtra } from "comfy.js";
import sanitizeHtml from "sanitize-html";

import { CommandMonitor } from './commandMonitor';
import { Twitch } from '../integrations/twitch';
import { EventBus } from "../events";
import { AutoBaldConfig, User, OnChatMessageEvent, OnCommandEvent, OnSayEvent, OnSubEvent, OnRaidEvent, OnCheerEvent, OnPartEvent, OnJoinEvent, Stream, OnStreamEvent } from "../types";
import { BotEvents } from "../botEvents";
import { log, LogLevel } from "../log";
import { SubMethods } from 'tmi.js'

export class Chat {
    commandMonitor: CommandMonitor

    constructor(private config: AutoBaldConfig) {

        this.commandMonitor = new CommandMonitor()

        ComfyJS.onChat = this.onChat.bind(this);
        ComfyJS.onCommand = this.onCommand.bind(this);
        ComfyJS.onCheer = this.onCheer.bind(this);
        ComfyJS.onRaid = this.onRaid.bind(this);
        ComfyJS.onResub = this.onResub.bind(this)
        ComfyJS.onSub = this.onSub.bind(this)
        ComfyJS.onSubGift = this.onSubGift.bind(this)
        ComfyJS.onSubMysteryGift = this.onSubMysteryGift.bind(this)
        ComfyJS.onJoin = this.onJoin.bind(this)
        ComfyJS.onPart = this.onPart.bind(this)

        ComfyJS.Init(this.config.twitchBotUsername, this.config.twitchBotAuthToken, this.config.twitchChannelName);

        EventBus.eventEmitter.addListener(BotEvents.OnSay,
            (onSayEvent: OnSayEvent) => this.onSay(onSayEvent))
    }

    public close() {
        ComfyJS.Disconnect();
    }

    private onSay(onSayEvent: OnSayEvent) {
        ComfyJS.Say(onSayEvent.message, this.config.twitchChannelName)
    }

    private async onCommand(user: string, command: string, message: string, flags: OnMessageFlags, extra: OnCommandExtra) {
        log(LogLevel.Info, `onCommand: ${user} sent the ${command} command`)
        let userInfo: User

        try {
            userInfo = await Twitch.getUser(user)
            await this.streamCheck();
        }
        catch (err) {
            log(LogLevel.Error, `onCommand: getUser: ${err}`)
        }

        // Only respond to commands if we're streaming, or debugging
        if (userInfo) {
            this.emit(BotEvents.OnCommand, new OnCommandEvent(userInfo, command, message, flags, extra));
        }
    }

    private async onChat(user: string, message: string, flags: OnMessageFlags, self: boolean, extra: OnMessageExtra) {
        log(LogLevel.Info, `onChat: ${user}: ${message}`)

        user = user.toLocaleLowerCase();
        await this.streamCheck();

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

    private async onJoin(user: string, self: boolean) {
        log(LogLevel.Info, `onJoin: ${user}`)
        let userInfo: User

        try {
            userInfo = await Twitch.getUser(user)
        }
        catch (err) {
            log(LogLevel.Error, `onJoin: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnJoin, new OnJoinEvent(userInfo, self))
        }
    }

    private async onPart(user: string, self: boolean) {
        log(LogLevel.Info, `onPart: ${user}`)
        let userInfo: User

        try {
            userInfo = await Twitch.getUser(user)
        }
        catch (err) {
            log(LogLevel.Error, `onPart: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnPart, new OnPartEvent(userInfo, self))
        }
    }

    private async onCheer(user: string, message: string, bits: number, flags: OnCheerFlags, extra: OnCheerExtra) {
        log(LogLevel.Info, `onCheer: ${user} cheered ${bits} bits`)
        let userInfo: User

        try {
            userInfo = await Twitch.getUser(user)
            await this.streamCheck();
        }
        catch (err) {
            log(LogLevel.Error, `onCheer: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnCheer, new OnCheerEvent(userInfo, message, bits, flags, extra))
        }
    }

    private async onRaid(user: string, viewers: number) {
        log(LogLevel.Info, `onRaid: ${user} raided with ${viewers} viewers`)
        let userInfo: User

        try {
            userInfo = await Twitch.getUser(user)
            await this.streamCheck();
        }
        catch (err) {
            log(LogLevel.Error, `onRaid: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnRaid, new OnRaidEvent(userInfo, viewers))
        }
    }

    private async onSub(user: string, message: string, subTierInfo: SubMethods, extra: OnSubExtra) {
        log(LogLevel.Info, `onSub: ${user} subbed`)
        let userInfo: User

        try {
            userInfo = await Twitch.getUser(user)
            await this.streamCheck();
        }
        catch (err) {
            log(LogLevel.Error, `onSub: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnSub, new OnSubEvent(userInfo, message, subTierInfo, extra))
        }
    }

    private async onSubGift(gifterUser: string, streakMonths: number, recipientUser: string, senderCount: number, subTierInfo: SubMethods, extra: OnSubGiftExtra) {
        log(LogLevel.Info, `onSubGift: ${gifterUser} gifted a sub to ${recipientUser}`)
        let userInfo: User
        let gifterInfo: User

        try {
            await this.streamCheck();
            userInfo = await Twitch.getUser(recipientUser)
        }
        catch (err) {
            log(LogLevel.Error, `onSubGift: ${err}`)
        }

        try {
            gifterInfo = await Twitch.getUser(gifterUser)
        }
        catch (err) {
            log(LogLevel.Error, `onSubGift: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnSub, new OnSubEvent(userInfo, '', subTierInfo, extra, null, gifterInfo))
        }
    }

    private async onResub(user: string, message: string, streakMonths: number, cumulativeMonths: number, subTierInfo: SubMethods, extra: OnResubExtra) {
        log(LogLevel.Info, `onResub: ${user} resubbed for ${cumulativeMonths} total months`)
        let userInfo: User

        try {
            await this.streamCheck();
            userInfo = await Twitch.getUser(user)
        }
        catch (err) {
            log(LogLevel.Error, `onResub: ${err}`)
        }

        if (userInfo) {
            this.emit(BotEvents.OnSub, new OnSubEvent(userInfo, message, subTierInfo, extra, cumulativeMonths))
        }
    }

    private async onSubMysteryGift(gifterUser: string, numbOfSubs: number, senderCount: number, subTierInfo: SubMethods, extra: OnSubMysteryGiftExtra) {
        log(LogLevel.Info, `onSubMysteryGift: ${gifterUser} gifted ${numbOfSubs}`)
        await this.streamCheck();
    }

    private emit(event: BotEvents, payload: unknown) {
        EventBus.eventEmitter.emit(event, payload)
    }

    private async streamCheck() {
        const streamDate = new Date().toLocaleDateString('en-US')
        await Twitch.getStream(streamDate)
    }
}
