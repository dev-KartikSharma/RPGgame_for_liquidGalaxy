import { Server } from 'socket.io';

const io = new Server(8128, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log("Socket.io Server running on port 8128");

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Relay player updates from Master to Slaves
    socket.on('player_update', (data) => {
        // Broadcast the update to all other connected screens (slaves)
        socket.broadcast.emit('player_update', data);
    });

    socket.on('enemy_update', (data) => {
        socket.broadcast.emit('enemy_update', data);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});
