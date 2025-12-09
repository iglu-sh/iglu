import Redis from "@/lib/redis";

const redis = new Redis()
await redis.advertiseNewBuildJob("11111", "1")
await redis.quit()