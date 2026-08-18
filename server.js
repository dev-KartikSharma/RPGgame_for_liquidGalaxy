import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static frontend assets from dist folder when built for production
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get(/.*/, (req, res, next) => {
  if (req.accepts("html")) {
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        next();
      }
    });
  } else {
    next();
  }
});

const PORT = process.env.PORT || 8128;
httpServer.listen(PORT, () => {
  console.log(`Server and Socket.io running on port ${PORT}`);
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Relay player updates from Master to Slaves
  socket.on("player_update", (data) => {
    socket.broadcast.emit("player_update", data);
  });

  socket.on("enemy_update", (data) => {
    socket.broadcast.emit("enemy_update", data);
  });

  socket.on("start_game", () => {
    socket.broadcast.emit("start_game");
  });

  socket.on("map_transition", (data) => {
    socket.broadcast.emit("map_transition", data);
  });

  socket.on("coin_spawn", (data) => {
    socket.broadcast.emit("coin_spawn", data);
  });

  socket.on("coin_pickup", (data) => {
    socket.broadcast.emit("coin_pickup", data);
  });

  socket.on("projectile_spawn", (data) => {
    socket.broadcast.emit("projectile_spawn", data);
  });

  socket.on("explosion_spawn", (data) => {
    socket.broadcast.emit("explosion_spawn", data);
  });

  socket.on("game_pause", () => {
    socket.broadcast.emit("game_pause");
  });

  socket.on("game_resume", () => {
    socket.broadcast.emit("game_resume");
  });

  socket.on("game_restart", () => {
    socket.broadcast.emit("game_restart");
  });

  socket.on("quit_to_main", () => {
    socket.broadcast.emit("quit_to_main");
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
