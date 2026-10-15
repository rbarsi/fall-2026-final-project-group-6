import "dotenv/config";
import { app } from "./app.js";
import { db } from "./db/database.js";

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => { void db.destroy().then(() => process.exit(0)); });
  });
}
