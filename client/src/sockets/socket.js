import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io("http://localhost:8080", {
    autoConnect: false,
    auth: { token: localStorage.getItem("token") }
  });
  return socket;
}
