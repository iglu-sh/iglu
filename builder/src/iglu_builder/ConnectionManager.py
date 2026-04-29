from fastapi import WebSocket
from fastapi.websockets import WebSocketState

from iglu_builder.types.WsResponse import WsResponse


class ConnectionManager:
    _active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Add a new websocket connection to the list

        Parameters:
            websocket (WebSocket): the websocket to add
        """
        await websocket.accept()
        self._active_connections.append(websocket)

    async def disconnect_all(self) -> None:
        """Clear the hole connection list"""
        for websocket in self._active_connections:
            await websocket.close()

        self._active_connections.clear()

    async def direct_message(self, data: WsResponse, websocket: WebSocket) -> None:
        """Send a message to only one client

        Parameters:
            data (WsResponse): the response which should be send to the client
            websocket (WebSocket): the websocket to which the message should be send
        """
        await websocket.send_json(data.to_dict())

    async def broadcast(self, data: WsResponse) -> None:
        """Sends a message to all websocket connections

        Parameters:
            data (WsResponse): the response which should be send to all websockets
        """
        for connection in self._active_connections:
            if connection.client_state != WebSocketState.CONNECTED:
                self._active_connections.remove(connection)
                continue
            await connection.send_json(data.to_dict())
