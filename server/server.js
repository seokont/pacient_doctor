import express from "express";
import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./services/socketService.js";
import { authenticateSocket } from "./middleware/auth.js";

import historyRouter from "./router/history.js";
import { ensureSchema } from "./util/ensureSchema.js";

await ensureSchema();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

app.use("/history", historyRouter);

io.use(authenticateSocket);

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
