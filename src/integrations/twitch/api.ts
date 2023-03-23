import axios, { AxiosResponse } from 'axios'
import { AutoBaldConfig, Stream, User } from '../../types'
import { LogLevel, log } from '../../log';

export class TwitchAPI {

  private twitchAPIEndpoint = 'https://api.twitch.tv/helix'
  private twitchAPIUserEndpoint = `${this.twitchAPIEndpoint}/users`
  private twitchAPIStreamEndpoint = `${this.twitchAPIEndpoint}/streams`
  private twitchAPIWebhookEndpoint = `${this.twitchAPIEndpoint}/eventsub/subscriptions`

  private headers: Record<string, string | number | boolean>
  private wsHeaders: Record<string, string | number | boolean>

  constructor(private config: AutoBaldConfig) {
    this.headers = {
      Authorization: `Bearer ${this.config.twitchChannelAuthToken}`,
      'Content-Type': 'application/json',
      'Client-ID': this.config.twitchClientId
    }
    this.wsHeaders = {
      Authorization: `Bearer ${this.config.twitchBotAuthToken}`,
      'Content-Type': 'application/json',
      'Client-ID': this.config.twitchClientId
    }
  }

  /**
   * Registers all websocket subscriptions with Twitch directed to this instance of the bot
   */
  public async registerWebSocketSubscriptions(sessionId: string): Promise<void> {
    
    log(LogLevel.Info, 'Registering WebSocket subscriptions')

    await this.registerFollowWSSubscription(sessionId);
    await this.registerStreamOnlineWSSubscription(sessionId);
    await this.registerStreamOfflineWSSubscription(sessionId);
  }

  private async registerFollowWSSubscription(sessionId: string): Promise<void> {
    try {
      const payload = {
        "type": "channel.follow",
        "version": "2",
        "condition": {
          "broadcaster_user_id": this.config.twitchChannelId,
          "moderator_user_id": this.config.twitchBotChannelId
        },
        "transport": {
          "method": "websocket",
          "session_id": sessionId
        }
      };

      const response = await axios.post(
        this.twitchAPIWebhookEndpoint,
        payload,
        {
          headers: this.wsHeaders
        })
      log(LogLevel.Info, `TwitchAPI:registerFollowWSSubscription - Response ${response.status}`);
    } catch (err) {
      console.dir(err)
      log(LogLevel.Error, `TwitchAPI:registerFollowWSSubscription ${err}`);
    }
  }

  private async registerStreamOnlineWSSubscription(sessionId: string): Promise<void> {
    try {
      const payload = {
        "type": "stream.online",
        "version": "1",
        "condition": { "broadcaster_user_id": `${this.config.twitchChannelId}` },
        "transport": { "method": "websocket", "session_id": sessionId }
      };

      const response = await axios.post(
        this.twitchAPIWebhookEndpoint,
        payload,
        {
          headers: this.headers
        });
      log(LogLevel.Info, `TwitchAPI:registerStreamOnlineWSSubscription - Response = ${response.status}`);
    } catch (err) {
      log(LogLevel.Error, `TwitchAPI:registerStreamOnlineWSSubscription ${err}`);
    }
  }

  private async registerStreamOfflineWSSubscription(sessionId: string): Promise<void> {
    try {
      const payload = {
        "type": "stream.offline",
        "version": "1",
        "condition": { "broadcaster_user_id": `${this.config.twitchChannelId}` },
        "transport": { "method": "websocket", "session_id": sessionId }
      };

      const response = await axios.post(
        this.twitchAPIWebhookEndpoint,
        payload,
        {
          headers: this.headers
        });
      log(LogLevel.Info, `TwitchAPI:registerStreamOfflineWSSubscription - Response = ${response.status}`);
    } catch (err) {
      log(LogLevel.Error, `TwitchAPI:registerStreamOfflineWSSubscription ${err}`);
    }
  }

  /**
   * Retrieves data regarding a Twitch user from the Twitch API
   * @param login username of the user to retrieve
   */
  public async getUser(login: string): Promise<User | undefined> {

    const url = `${this.twitchAPIUserEndpoint}?login=${login}`

    let user: User | undefined = undefined;

    try {
      const response: AxiosResponse = await axios.get(url, { headers: this.headers })
      if (response.data) {
        const body = response.data
        const userData = body.data.length > 1 ? body.data : body.data[0]
        if (userData) {
          user = {
            login: userData.login,
            avatar_url: userData.profile_image_url,
            id: userData.id,
            display_name: userData.display_name,
            lastUpdated: new Date()
          }
        }
      }
    } catch (err) {
      log(LogLevel.Error, `TwitchAPI:getUser ${err}`)
    }
    return user
  }

  public async getStream(streamDate: string): Promise<Stream | undefined> {

    const url = `${this.twitchAPIStreamEndpoint}?user_id=${this.config.twitchChannelId}&first=1`

    let stream: Stream | undefined;

    try {
      const response: AxiosResponse = await axios.get(url, { headers: this.headers })
      if (response.data) {
        const body = response.data
        const streamData = body.data.length > 1 ? body.data : body.data[0]
        if (streamData) {
          stream = {
            started_at: streamData.started_at, 
            streamDate, 
            title: streamData.title
          } as Stream
        }
      }
    } catch (err) {
      log(LogLevel.Error, `TwitchAPI:getStream ${err}`)
    }

    return stream
  }
}
