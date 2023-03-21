import { Server as IOServer, Socket } from "socket.io";
import { WebSocket, MessageEvent } from "ws";
import { Server as HttpServer } from "http";

import { EventBus } from "../events";
import { AutoBaldConfig, OnChatMessageEvent, OnCheerEvent, OnCommandEvent, OnFollowEvent, OnJoinEvent, OnPartEvent, OnPointRedemptionEvent, OnRaidEvent, OnSoundEffectEvent, OnStopEvent, OnStreamEvent, OnSubEvent, Stream, TwitchFollowEvent, TwitchStreamEvent, TwitchWebSocketMessage, TwitchWebSocketPayloadSession, User, UserEvent } from "../types";
import { BotEvents } from "../botEvents";
import { log, LogLevel } from "../log";
import { Twitch } from "../integrations/twitch";
import { Tigris } from "../integrations/tigris";

export class WebSockets {

    private io: IOServer
    private client: WebSocket

    constructor(server: HttpServer, config: AutoBaldConfig) {
        this.io = new IOServer(server)

        this.io.on('connect', (conn: Socket) => {
            // Ensure the connection is from the bots www and not
            // and external actor.
            if (conn.handshake.headers.host !== config.wwwHost) {
                log(LogLevel.Info, `WS disconnected as not an approved host ${conn.handshake.headers.host} : ${config.wwwHost}`)
                conn.disconnect(true)
            }
        })

        this.client = new WebSocket("wss://eventsub-beta.wss.twitch.tv/ws");

        this.client.onclose = (event) => {
            this.client = new WebSocket("wss://eventsub-beta.wss.twitch.tv/ws");
        }

        this.client.onerror = (err) => {
            log(LogLevel.Error, `Twitch WS: ${err}`)
        }

        this.client.onmessage = async (event: MessageEvent) => await this.clientMessage(JSON.parse(event.data));

        EventBus.eventEmitter.addListener(BotEvents.OnChatMessage,
            (onChatMessageEvent: OnChatMessageEvent) => this.onChat(onChatMessageEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnCommand,
            (onCommandEvent: OnCommandEvent) => this.onCommand(onCommandEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnSoundEffect,
            (onSoundEffectEvent: OnSoundEffectEvent) => this.onSoundEffect(onSoundEffectEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnCheer,
            (onCheerEvent: OnCheerEvent) => this.onCheer(onCheerEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnFollow,
            (onFollowEvent: OnFollowEvent) => this.onFollow(onFollowEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnJoin,
            (onJoinEvent: OnJoinEvent) => this.onJoin(onJoinEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnPart,
            (onPartEvent: OnPartEvent) => this.onPart(onPartEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnPointRedemption,
            (onPointRedemptionEvent: OnPointRedemptionEvent) => this.onPointRedemption(onPointRedemptionEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnStop,
            (onStopEvent: OnStopEvent) => this.onStop(onStopEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnSub,
            (onSubEvent: OnSubEvent) => this.onSub(onSubEvent))
        EventBus.eventEmitter.addListener(BotEvents.OnRaid,
            (onRaidEvent: OnRaidEvent) => this.onRaid(onRaidEvent))
    }

    private async clientMessage(message: TwitchWebSocketMessage) {
        log(LogLevel.Info, `Twitch WS message received: ${message.metadata.message_type}`)
        switch (message.metadata.message_type) {
            case "session_welcome":
            case "session_reconnect":
                await this.clientRegisterSubscriptions(message.payload.session);
                break;

            case "revocation":
            case "session_keepalive":
                break;

            case "notification":
                await this.clientHandleNotification(message);
        }
    }

    private async clientRegisterSubscriptions(session: TwitchWebSocketPayloadSession) {
        await Twitch.registerWebhooks(session.id);
    }

    private async clientHandleNotification(message: TwitchWebSocketMessage) {
        switch (message.metadata.subscription_type) {
            case "channel.follow":
                await this.clientHandleOnFollow(message.payload.event as TwitchFollowEvent);
                break;
            case "stream.offline":
                await this.clientHandleStreamOffline(message.payload.event as TwitchStreamEvent);
                break;
            case "stream.online":
                await this.clientHandleStreamOnline(message.payload.event as TwitchStreamEvent);
                break;
        }
    }

    private async clientHandleOnFollow(twitchFollowEvent: TwitchFollowEvent) {
        let userInfo: User
        try {
            userInfo = await Twitch.getUser(twitchFollowEvent.user_login.toLocaleLowerCase())
        }
        catch (err) {
            log(LogLevel.Error, `webhooks: /follow - ${err}`)
        }
        log(LogLevel.Info, `WS Follow: ${userInfo.display_name}`)
        this.emit(BotEvents.OnFollow, new OnFollowEvent(userInfo));
    }
    
    private async clientHandleStreamOffline(twitchStreamEvent: TwitchStreamEvent) {
        let stream: Stream
        const streamDate = new Date().toLocaleDateString('en-US')
        try {
            stream = await Twitch.getStream(streamDate)
            stream.ended_at = stream.ended_at || new Date().toISOString()
            await Twitch.saveStream(stream)
        }
        catch (err) {
            log(LogLevel.Error, `webhooks: /stream_offline - ${err}`)
        }
        log(LogLevel.Info, `WS Stream Offline: ${streamDate}`)

        this.emit(BotEvents.OnStreamEnd, {stream} as OnStreamEvent);
    }
    
    private async clientHandleStreamOnline(streamOnlineEvent: TwitchStreamEvent) {
        let stream: Stream
        const streamDate = new Date(streamOnlineEvent.started_at).toLocaleDateString('en-US')
        try {
            stream = await Twitch.getStream(streamDate)
        }
        catch (err) {
            log(LogLevel.Error, `webhooks: /stream_online - ${err}`)
        }
        log(LogLevel.Info, `WS Stream Online: ${streamDate}`)
        this.emit(BotEvents.OnStreamStart, { stream } as OnStreamEvent);
    }

    private onChat(onChatMessageEvent: OnChatMessageEvent) {
        this.io.emit(BotEvents.OnChatMessage, onChatMessageEvent)
        Tigris.saveUserEvent(onChatMessageEvent)
    }
    
    private onCommand(onCommandEvent: OnCommandEvent) {
        Tigris.saveUserEvent(onCommandEvent)
    }

    private onSoundEffect(onSoundEffectEvent: OnSoundEffectEvent) {
        this.io.emit(BotEvents.OnSoundEffect, onSoundEffectEvent)
    }

    private onCheer(onCheerEvent: OnCheerEvent) {
        this.io.emit(BotEvents.OnCheer, onCheerEvent)
        Tigris.saveUserEvent(onCheerEvent)
    }

    private onFollow(onFollowEvent: OnFollowEvent) {
        this.io.emit(BotEvents.OnFollow, onFollowEvent)
        Tigris.saveUserEvent(onFollowEvent)
    }

    private onJoin(onJoinEvent: OnJoinEvent) {
        this.io.emit(BotEvents.OnJoin, onJoinEvent)
    }

    private onPart(onPartEvent: OnPartEvent) {
        this.io.emit(BotEvents.OnPart, onPartEvent)
    }

    private onPointRedemption(onPointRedemptionEvent: OnPointRedemptionEvent) {
        this.io.emit(BotEvents.OnPointRedemption, onPointRedemptionEvent)
        Tigris.saveUserEvent(onPointRedemptionEvent)
    }

    private onStop(onStopEvent: OnStopEvent) {
        this.io.emit(BotEvents.OnStop, onStopEvent)
    }

    private onSub(onSubEvent: OnSubEvent) {
        this.io.emit(BotEvents.OnSub, onSubEvent)
        Tigris.saveUserEvent(onSubEvent)
    }

    private onRaid(onRaidEvent: OnRaidEvent) {
        this.io.emit(BotEvents.OnRaid, onRaidEvent)
        Tigris.saveUserEvent(onRaidEvent)
    }

    private emit(event: BotEvents, payload: UserEvent | OnStreamEvent) {
        EventBus.eventEmitter.emit(event, payload)
    }
}