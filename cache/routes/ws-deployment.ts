/*
import z from "zod";
const message_schema = z.object({
    agent: z.string(),
    command: z.object({
        closureSize: z.number().nullable(),
        id: z.string(),
        tag: z.string(),
        time: z.iso.datetime(),
    }),
    id: z.string(),
    method: z.string(),
});
*/

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
