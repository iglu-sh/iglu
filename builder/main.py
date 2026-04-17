from json import JSONDecodeError
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
from app.builder import Builder
from app.types import IgluResponse, PreDefinedResponse
from typing import Any
from app.connection_manager import ConnectionManager

app = FastAPI()
conCount = 0
@app.get("/api/v1/healthcheck")
async def healthcheck() -> IgluResponse:
    if(Builder.check_health()):
        return PreDefinedResponse.HEALTHY() 
    else:
        return PreDefinedResponse.UNHEALTHY()

@app.websocket("/api/v1/build")
async def build(websocket: WebSocket) -> None:
    await ConnectionManager.connect(websocket)

    # Waiting for Config to be send if no process runs
    if not Builder.process_is_running():
        try:
            config: Any = await websocket.receive_json() # pyright: ignore[reportExplicitAny, reportAny]
            _ = Builder.set_config(config)
            await Builder.build()
        except JSONDecodeError:
            await ConnectionManager.direct_message(PreDefinedResponse.INVALID_CONFIG(), websocket)
    

app.mount("/", StaticFiles(directory="static",html = True), name="static")
