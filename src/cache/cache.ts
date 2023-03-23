import { User, Stream } from "../types"
import { CacheType } from "./cacheType"

type Store = {
  users: Record<string, User>,
  streams: Record<string, Stream>
}

export abstract class Cache {

  private static store: Store = {
    users: {},
    streams: {}
  }

  public static get(cacheType: CacheType, identifier: string): unknown {
    return this.store[cacheType][identifier]
  }

  public static set(cacheType: CacheType, object: User | Stream): void {
    const identifier = cacheType === CacheType.Stream ? 
                        (object as Stream).streamDate : 
                        (object as User).id;

    this.store[cacheType][identifier] = object;
  }
}