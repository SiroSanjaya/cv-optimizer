import "dotenv/config";
import { createApp } from "./app";
import { logger } from "./utils/logger";

const PORT = Number(process.env.PORT ?? 4000);

const app = createApp();

app.listen(PORT, () => {
  logger.info("server_started", { port: PORT });
});
