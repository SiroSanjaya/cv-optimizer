import Redis from "ioredis";

let redisClient: Redis | undefined;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required for shared rate limiting and AI jobs.");
  }

  redisClient = new Redis(url, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null,
  });
  redisClient.on("error", (error) => {
    console.error(JSON.stringify({
      level: "error",
      event: "redis_connection_error",
      message: error.message,
    }));
  });
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) return;
  const client = redisClient;
  redisClient = undefined;
  await client.quit();
}
