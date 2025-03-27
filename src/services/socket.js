// src/services/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // Change this to match your deployed backend if needed

export default socket;
