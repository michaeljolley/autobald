import { Server as IOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";

import { EventBus } from "../events";
import { AutoBaldConfig, OnChatMessageEvent } from "../types";
import { BotEvents } from "../botEvents";
import { log, LogLevel } from "../log";

export class WebSockets {

    private io: IOServer

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

        EventBus.eventEmitter.addListener(BotEvents.OnChatMessage,
            (onChatMessageEvent: OnChatMessageEvent) => this.onChat(onChatMessageEvent))

    }

    private onChat(onChatMessageEvent: OnChatMessageEvent) {
        this.io.emit(BotEvents.OnChatMessage, onChatMessageEvent)
    }

}