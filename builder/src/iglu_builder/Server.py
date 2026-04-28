from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic_core import PydanticCustomError
import uvicorn
from iglu_builder.ConfigManager import Config, ConfigManager
from iglu_builder.Builder import Builder
from fastapi.staticfiles import StaticFiles
import os
from pydantic import TypeAdapter, ValidationError

from iglu_builder.ConnectionManager import ConnectionManager
from iglu_builder.types.Job import Job
from iglu_builder.types.WsResponse import WsResponse


class Server:
    _conf: Config
    _app: FastAPI
    _builder: Builder | None
    _cm: ConnectionManager

    def __init__(self, conf: ConfigManager) -> None:
        """Create a FastAPI Server

        Parameters:
            conf (ConfigManager): ConfigManager object
        """
        self._conf = conf.get_conf()
        self._app = FastAPI()
        self._register_routes()
        self._cm = ConnectionManager()
        self._builder = None

    def get_app(self) -> FastAPI:
        return self._app

    def _register_routes(self) -> None:
        """Register new routes on app"""

        # Endpoint with websocket to build derivations
        @self._app.websocket("/api/v1/build")
        async def build(websocket: WebSocket) -> None:
            await self._build(websocket)

        # Endpoint with test page
        # IMPORTANT: has to be the last one, so that all routes are already loaded
        self._app.mount(
            path="/",
            app=StaticFiles(directory=os.path.dirname(__file__) + "/static", html=True),
            name="static",
        )

    async def _build(self, websocket: WebSocket) -> None:
        await self._cm.connect(websocket)

        try:
            if self._builder is None:
                job = await websocket.receive_json()
                try:
                    adapter = TypeAdapter(Job)
                    adapter.rebuild(_types_namespace={"os": os})
                    job = adapter.validate_python(job)

                    if job["command"][0] not in self._conf["allowed_commands"]:
                        raise ValidationError.from_exception_data(
                            title="Value Error",
                            line_errors=[
                                {
                                    "type": PydanticCustomError(
                                        "not_allowed_command_error",
                                        f"command must start with one of {str(self._conf['allowed_commands'])}.",  # pyright: ignore[reportArgumentType]
                                    ),
                                    "input": job,
                                }
                            ],
                        )

                    self._builder = Builder(self._conf, job, self._cm)
                    await self._builder.build()
                except ValidationError as e:
                    await self._cm.broadcast(
                        WsResponse(400, "Bad Request", True, {"error": repr(e)})
                    )

                # Cleanup
                del self._builder
                self._builder = None
                await self._cm.disconnect_all()
            else:
                while True:
                    pass

        except WebSocketDisconnect:
            # The websocket could be closes from the client
            # this is totaly acceptable
            pass

    def run(self) -> None:
        """Start the server"""
        port = self._conf["port"]
        host = self._conf["host"]
        dev_mode = self._conf["dev_mode"]

        uvicorn.run("iglu_builder.__main__:app", host=host, port=port, reload=dev_mode)
