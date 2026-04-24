import type { Request } from "express";

export const ws = [
    async (socket:WebSocket, req:Request) => {
        console.log('Log WS Connected')
        socket.onmessage = (msg) => {
            console.log('LOG: MSG Received:', msg.data.toString())
        }

        socket.onclose = () => {
            console.log("LOG: socket closed")
        }
    }
]
