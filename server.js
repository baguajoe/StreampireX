const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // ✅ Replace with frontend domain in production
    },
});

// In-memory store (for dev; replace with DB for production)
let users = {};

io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // JOIN ROOM
    socket.on("join_room", ({ roomId, userId, username }) => {
        socket.join(roomId);
        users[socket.id] = { userId, username, roomId };
        console.log(`👥 ${username} joined room ${roomId}`);

        socket.to(roomId).emit("user_joined", {
            userId,
            username,
            message: `${username} joined the chat.`,
        });
    });

    // MESSAGE HANDLER
    socket.on("chat_message", (data) => {
        const messagePayload = {
            room: data.room,
            from: data.from,
            to: data.to,
            text: data.text || "",
            mediaUrl: data.mediaUrl || null,
            timestamp: new Date().toISOString(),
        };

        console.log("📨 Message:", messagePayload);

        // Emit to room
        io.to(data.room).emit("chat_message", messagePayload);

        // (Optional) Trigger backend persistence if needed
        // You could make a POST request here to Flask API to store
        // e.g. axios.post('http://localhost:5001/api/save-chat', messagePayload)
    });

    // TYPING
    socket.on("typing", ({ room, from }) => {
        socket.to(room).emit("typing", { from });
    });

    socket.on("stop_typing", ({ room, from }) => {
        socket.to(room).emit("stop_typing", { from });
    });

    // POLL DEMO
    socket.emit("new_poll", {
        question: "What's your favorite color?",
        options: ["Red", "Blue", "Green"],
    });

    socket.on("poll_response", (response) => {
        console.log("📊 Poll response:", response);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
        const user = users[socket.id];
        if (user?.roomId) {
            socket.to(user.roomId).emit("user_left", {
                username: user.username,
                message: `${user.username} left the chat.`,
            });
        }
        delete users[socket.id];
        console.log("❌ Disconnected:", socket.id);
    });
});

server.listen(5000, () => {
    console.log("🚀 WebSocket server running on port 5000");
});
