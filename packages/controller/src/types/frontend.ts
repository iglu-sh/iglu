import type {apiKeyWithCache, cache, keys, User} from "@/types/db";

export interface cacheCreationObject extends cache{
    selectedApiKeys: keys[];
    collectMetrics: boolean;
    retentionDays: number;
    allowedUsers: User[];
}