import type { Request } from "express";

export const ws = [
    async (socket: WebSocket, req: Request) => {
        console.log('DEPLOYMENT: WS Connected') 

        socket.onmessage = (msg) => {
            console.log('DEPLOYMENT: MSG Received:', msg.data.toString())
        }

        socket.onclose = () => {
            console.log("DEPLOYMENT: socket closed")
        }
    }
]
