from fastapi import WebSocket

from app.types import IgluResponse

class ConnectionManager():
    _active_connections: list[WebSocket] = []

    @classmethod
    async def connect(cls, websocket: WebSocket) -> None:
        """Add a new websocket connection to the list
        
        Parameters:
            websocket (WebSocket): the websocket to add
        """
        await websocket.accept()
        cls._active_connections.append(websocket)

    @classmethod
    def disconnect(cls, websocket: WebSocket) -> None:
        """Remove a single connnection from the connection list
        
        Parameters:
            websocket (WebSocket): the websocket to remove 
        """
        if websocket in cls._active_connections:
            cls._active_connections.remove(websocket)

    @classmethod
    def disconnect_all(cls) -> None:
        """Clear the hole connection list"""
        cls._active_connections.clear()

    @classmethod
    async def direct_message(cls, data: IgluResponse, websocket: WebSocket) -> None:
        """Send a message to only one client

        Parameters:
            data (IgluResponse): the response which should be send to the client
            websocket (WebSocket): the websocket to which the message should be send
        """
        await websocket.send_json(data)

    @classmethod
    async def broadcast(cls, data: IgluResponse) -> None:
        """Sends a message to all websocket connections
        
        Parameters:
            data (IgluResponse): the response which should be send to all websockets
        """
        for connection in cls._active_connections:
            await connection.send_json(data)
