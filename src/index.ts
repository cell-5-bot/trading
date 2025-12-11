import "dotenv/config";
import express from "express";
import { createBot } from "./bot";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();
app.use(express.json());

app.get("/", (_req, res) => res.send("MetasolanaBot is running"));

app.post("/webhook", (req, res) => {
  res.sendStatus(200);
});

const server = app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await createBot();
});

export default server;
