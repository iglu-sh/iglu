export const ws = [
    async (socket: WebSocket) => {
        console.log("DEPLOYMENT: WS Connected");

        socket.onmessage = (msg) => {
            console.log("DEPLOYMENT: MSG Received:", msg.data.toString());
        };

        socket.onclose = () => {
            console.log("DEPLOYMENT: socket closed");
        };
    },
];
