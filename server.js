// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Optional: Use only if you expect CORS issues

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // ✅ In production: replace with frontend domain
        methods: ["GET", "POST"]
    }
});

// In-memory store for user tracking (for development)
let users = {};

io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // ==========================
    // 🚪 ROOM JOINING
    // ==========================
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

    // ==========================
    // 💬 CHAT MESSAGES
    // ==========================
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
        io.to(data.room).emit("chat_message", messagePayload);
    });

    // ==========================
    // ✍️ TYPING INDICATORS
    // ==========================
    socket.on("typing", ({ room, from }) => {
        socket.to(room).emit("typing", { from });
    });

    socket.on("stop_typing", ({ room, from }) => {
        socket.to(room).emit("stop_typing", { from });
    });

    // ==========================
    // 📊 POLL DEMO
    // ==========================
    socket.emit("new_poll", {
        question: "What's your favorite color?",
        options: ["Red", "Blue", "Green"],
    });

    socket.on("poll_response", (response) => {
        console.log("📊 Poll response:", response);
    });

    // ==========================
    // 📹 WebRTC SIGNALING
    // ==========================
    socket.on("offer", ({ offer, roomId, from }) => {
        console.log("📤 Offer from", from);
        socket.to(roomId).emit("offer", { offer, from });
    });

    socket.on("answer", ({ answer, to }) => {
        console.log("📥 Answer to", to);
        socket.to(to).emit("answer", { answer });
    });

    socket.on("ice-candidate", ({ candidate, roomId }) => {
        console.log("❄ ICE candidate sent to room:", roomId);
        socket.to(roomId).emit("ice-candidate", { candidate });
    });

    // ==========================
    // ❌ DISCONNECT
    // ==========================
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

// ==========================
// 🚀 START SERVER
// ==========================
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`🚀 WebSocket server running on http://localhost:${PORT}`);
});