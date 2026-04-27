export const ws = [
    async (socket: WebSocket) => {
        console.log("Log WS Connected");
        socket.onmessage = (msg) => {
            console.log("LOG: MSG Received:", msg.data.toString());
        };

        socket.onclose = () => {
            console.log("LOG: socket closed");
        };
    },
];
