import dotenv from 'dotenv';
import qs from 'querystring'
import express from 'express'
import http from 'http'
import axios, { AxiosResponse } from 'axios'

import { log, LogLevel } from './log';
import { Chat } from "./chat";
import { AutoBaldConfig, TwitchTokenResponse } from "./types";
import { Tigris } from './integrations/tigris';
import { Twitch } from './integrations/twitch';
import { WebSockets } from './websockets';
import { overlayRouter } from './www';

dotenv.config();

// Identify the Twitch credentials first
const TWITCH_API = 'https://id.twitch.tv/oauth2/token'
const TwitchClientId = process.env.TWITCH_CLIENT_ID
const TwitchClientSecret = process.env.TWITCH_CLIENT_SECRET

const authParams = qs.stringify({
    client_id: TwitchClientId,
    client_secret: TwitchClientSecret,
    grant_type: 'client_credentials'
})

axios.post(`${TWITCH_API}?${authParams}`)
    .then(init)
    .catch((reason: unknown) => log(LogLevel.Error, `Twitch OAuth booboo: ${reason}`))

async function init(response: AxiosResponse<TwitchTokenResponse>) {

    const twitchAuth = response.data

    const autoBaldConfig: AutoBaldConfig = {
        wwwHost: process.env.WWW_HOST ? process.env.WWW_HOST : "",
        wwwPort: process.env.WWW_PORT ? parseInt(process.env.WWW_PORT) : 3000,
        twitchChannelId: process.env.TWITCH_CHANNEL_ID ? process.env.TWITCH_CHANNEL_ID : "",
        twitchClientId: process.env.TWITCH_CLIENT_ID ? process.env.TWITCH_CLIENT_ID : "",
        twitchClientSecret: process.env.TWITCH_CLIENT_SECRET ? process.env.TWITCH_CLIENT_SECRET : "",
        twitchChannelAuthToken: twitchAuth.access_token,
        twitchChannelName: process.env.TWITCH_CHANNEL ? process.env.TWITCH_CHANNEL : "",
        twitchBotUsername: process.env.TWITCH_BOT_USERNAME ? process.env.TWITCH_BOT_USERNAME : "",
        twitchBotAuthToken: process.env.TWITCH_BOT_AUTH_TOKEN ? process.env.TWITCH_BOT_AUTH_TOKEN : "",
        tigrisClientId: process.env.TIGRIS_CLIENT_ID ? process.env.TIGRIS_CLIENT_ID : "",
        tigrisClientSecret: process.env.TIGRIS_CLIENT_SECRET ? process.env.TIGRIS_CLIENT_SECRET : "",
        tigrisProjectName: process.env.TIGRIS_PROJECT_NAME ? process.env.TIGRIS_PROJECT_NAME : "",
    }

    await Tigris.init(autoBaldConfig);
    Twitch.init(autoBaldConfig);

    const app = express()
    const server = http.createServer(app)

    const io = new WebSockets(server, autoBaldConfig);

    app.use('/overlays', overlayRouter)

    server.listen(autoBaldConfig.wwwPort, () => {
        log(LogLevel.Info, `Server is listening on port ${autoBaldConfig.wwwPort}`)
    })

    const chat = new Chat(autoBaldConfig);

    // close all streams and clean up anything needed for the stream
    // when the process is stopping
    process.on("SIGTERM", () => {
        log(LogLevel.Info, "Shutting down...")
        server.close()
        chat.close()
    })
}



