import { TwitchAPI } from './api'
import { Tigris } from '../tigris';
import { User, Stream, AutoBaldConfig } from '../../types'
import { Cache, CacheType } from '../../cache'
import { LogLevel, log } from '../../log'

export abstract class Twitch {

  private static config: AutoBaldConfig;
  private static twitchAPI: TwitchAPI;

  public static init(config: AutoBaldConfig): void {
    this.config = config;
    this.twitchAPI = new TwitchAPI(config)
  }

  public static async registerWebSocketSubscriptions(sessionId: string): Promise<void> {
    this.twitchAPI.registerWebSocketSubscriptions(sessionId);
  }

  /**
   * Attempts to retrieve a user from the cache and, if needed, the Twitch API
   * @param login Twitch login of user to retrieve
   */
  public static async getUser(id: string | number): Promise<User | undefined> {
  
    let user: User;
    
    if (Number.isInteger(id)) {
      user = Cache.get(CacheType.User, id.toString()) as User | undefined
    }

    const date = new Date();
    date.setDate(date.getDate() - 1);

    if (!user ||
      (!user.lastUpdated || user.lastUpdated < date)) {

      if (Number.isInteger(id)) {
        try {
          user = await Tigris.getUser(id.toString());
        }
        catch (err) {
          log(LogLevel.Error, `Twitch:getUser - Tigris:getUser: ${err}`)
        }
      }

      if (!user ||
        (!user.lastUpdated || user.lastUpdated < date)) {
        let apiUser: User
        try {
          apiUser = await this.twitchAPI.getUser(id)
        }
        catch (err) {
          log(LogLevel.Error, `Twitch:getUser - API:getUser: ${err}`)
        }

        if (apiUser) {
          user = await Tigris.saveUser(apiUser)
        }
      }
      if (user) {
        Cache.set(CacheType.User, user)
      }
    }

    return user
  }

  /**
   * Attempts to retrieve a stream from the cache and, if needed, the Twitch API
   * @param streamDate Date the stream started on
   */
  public static async getStream(streamDate: string): Promise<Stream | undefined> {
    let stream: Stream = Cache.get(CacheType.Stream, streamDate) as Stream | undefined

    if (!stream && this.config) {

      try {
        stream = await Tigris.getStream(streamDate)
      }
      catch (err) {
        log(LogLevel.Error, `Twitch:getStream - Tigris:getStream: ${err}`)
      }

      if (!stream || stream.ended_at) {
        let apiStream: Stream
        try {
          apiStream = await this.twitchAPI.getStream(streamDate)
        }
        catch (err) {
          log(LogLevel.Error, `Twitch:getStream - API:getStream: ${err}`)
        }

        if (apiStream) {
          stream = await Tigris.saveStream(apiStream)
        }
      }

      if (stream) {
        Cache.set(CacheType.Stream, stream)
      }
    }

    return stream
  }

  public static async saveStream(stream: Stream): Promise<Stream | undefined> {
    Cache.set(CacheType.Stream, stream)
    return await Tigris.saveStream(stream)
  }
}
