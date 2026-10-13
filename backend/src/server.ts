import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app";
import { validateProductionConfiguration } from "./utils/productionConfig";
import { logger } from "./utils/logger";
import { prisma } from "./utils/prisma";
import { closeAiQueue } from "./services/ai/aiTasks";
import { closeRedisClient, getRedisClient } from "./utils/redis";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  validateProductionConfiguration();
  await prisma.$connect();
  if (process.env.NODE_ENV === "production") {
    await getRedisClient().ping();
  }

  const server = createServer(createApp());
  server.listen(PORT, () => {
    logger.info("server_started", { port: PORT });
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("server_shutdown_started", { signal });
    server.close(async (error) => {
      try {
        await closeAiQueue();
        await closeRedisClient();
        await prisma.$disconnect();
      } catch (closeError) {
        logger.error("server_shutdown_cleanup_failed", {
          message: closeError instanceof Error ? closeError.message : "unknown",
        });
        process.exitCode = 1;
      }
      if (error) {
        logger.error("http_server_close_failed", { message: error.message });
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  logger.error("server_start_failed", {
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
