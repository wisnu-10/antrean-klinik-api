import "dotenv/config";
import app from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  process.stdout.write(`Backend listening on port ${env.port.toString()}\n`);
});
