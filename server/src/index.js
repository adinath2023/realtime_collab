import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { prisma } from "./prisma.js";
import { setupSockets } from "./sockets/index.js";

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN }
});

setupSockets(io, prisma);
app.locals.io = io;

server.listen(process.env.PORT || 8080, () => {
  console.log(`API listening on :${process.env.PORT || 8080}`);
});
