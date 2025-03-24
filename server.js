const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins, adjust as needed
    },
});

// Serve static files (if necessary, adjust based on your setup)
app.use(express.static("public"));

// Socket.IO event handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Emit a poll question to the connected user
    socket.emit("new_poll", {
        question: "What's your favorite color?",
        options: ["Red", "Blue", "Green"],
    });

    // Handle poll responses from users
    socket.on("poll_response", (response) => {
        console.log("Poll response:", response);
    });

    // Handle live chat messages
    socket.on("chat-message", ({ stationId, message }) => {
        io.emit(`station-${stationId}-chat-message`, { message });
        console.log(`Chat in Station ${stationId}:`, message);
    });

    // Handle disconnects
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start the Express server
server.listen(5000, () => {
    console.log("WebSocket server running on port 5000");
});
