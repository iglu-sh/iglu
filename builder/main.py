from fastapi import FastAPI, WebSocket
from app.builder import Builder
from app.types import Config
from pydantic import TypeAdapter, ValidationError

import app.msg as msg

app = FastAPI()


@app.get("/api/v1/healthcheck")
async def healthcheck():
    if(Builder.check_health()):
        return {"status": "healthy"}
    else:
        return {"status": "unhealthy"}

@app.websocket("/api/v1/build")
async def build(websocket: WebSocket) -> None:
    await websocket.accept()

    # Waiting for Config to be send
    try:
        configValidator = TypeAdapter(Config)
        config: Config = configValidator.validate_python(await websocket.receive_json())
        Builder.set_config(config)
    except ValidationError:
        await websocket.send_json(msg.gen_invalid_config())
        await websocket.close()
    
    await Builder.build(websocket)


