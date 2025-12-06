import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (token?: string) => {
    if (socket) return socket;

    const url = import.meta.env.VITE_API_URL || "http://localhost:8000";
    socket = io(url, {
        path: "/ws/socket.io", // Match backend mount path
        auth: { token },
        transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
        console.log("Connected to WebSocket", socket?.id);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from WebSocket");
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        return connectSocket();
    }
    return socket;
};
