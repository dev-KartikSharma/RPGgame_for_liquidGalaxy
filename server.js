import { Server } from "socket.io";

const io = new Server(8128, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

console.log("Socket.io Server running on port 8128");

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Relay player updates from Master to Slaves
  socket.on("player_update", (data) => {
    // Broadcast the update to all other connected screens (slaves)
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

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});
