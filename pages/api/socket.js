import { Server } from "socket.io";

const MAX_USERS = 10;
const MAX_MESSAGES = 100;
const DAY_MS = 86400000;

let users = new Map();     // socket.id → username
let messages = [];
let lastReset = Date.now();

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      const now = Date.now();

      // 24-hour reset
      if (now - lastReset > DAY_MS) {
        users.clear();
        messages = [];
        lastReset = now;
        io.emit("reset");
      }

      // Waiting room enforcement
      if (users.size >= MAX_USERS) {
        socket.emit("full");
        socket.disconnect();
        return;
      }

      const username = `user_${Math.floor(Math.random() * 100000)}`;
      users.set(socket.id, username);

      socket.emit("init", {
        username,
        messages
      });

      io.emit("count", users.size);

      socket.on("typing", (isTyping) => {
        socket.broadcast.emit("typing", {
          user: username,
          isTyping
        });
      });

      socket.on("msg", (text) => {
        if (!text || !text.trim()) return;

        const msg = {
          user: username,
          text,
          time: Date.now()
        };

        messages.push(msg);
        if (messages.length > MAX_MESSAGES) {
          messages.shift();
        }

        io.emit("msg", msg);
      });

      socket.on("disconnect", () => {
        users.delete(socket.id);
        io.emit("count", users.size);
      });
    });
  }

  res.end();
}
