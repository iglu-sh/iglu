import type {apiKeyWithCache, cache, keys, User} from "../core/db.d.ts";

export interface cacheCreationObject extends cache{
    selectedApiKeys: keys[];
    collectMetrics: boolean;
    retentionDays: number;
    allowedUsers: User[];
}
