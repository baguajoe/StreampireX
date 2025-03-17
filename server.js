const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 🎙️ Live Status Updates
    socket.on("live-status", ({ stationId, isLive }) => {
        io.emit(`station-${stationId}-live-status`, { stationId, isLive });
        console.log(`Station ${stationId} is now ${isLive ? "LIVE" : "OFFLINE"}`);
    });

    // 👥 New Follower Notification
    socket.on("new-follower", ({ stationId, userId }) => {
        io.emit(`station-${stationId}-new-follower`, { userId });
        console.log(`User ${userId} followed Station ${stationId}`);
    });

    // 🎵 Now Playing Track Updates
    socket.on("track-update", ({ stationId, track }) => {
        io.emit(`station-${stationId}-track-update`, { track });
        console.log(`Now playing on Station ${stationId}: ${track.title}`);
    });

    // 💬 Live Chat Messages
    socket.on("chat-message", ({ stationId, message }) => {
        io.emit(`station-${stationId}-chat-message`, { message });
        console.log(`Chat in Station ${stationId}:`, message);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

server.listen(5000, () => {
    console.log("WebSocket server running on port 5000");
});
