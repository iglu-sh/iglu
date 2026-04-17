import shutil
import asyncio
import re
import os
from datetime import datetime
from asyncio.subprocess import Process
from pty import openpty
from pydantic import TypeAdapter, ValidationError
from typing import Any
from app.connection_manager import ConnectionManager
from app.types import Config, IgluResponse
from app.types import PreDefinedResponse

class Builder:
    """This class provides all functinality to build and push derivations"""
    _config: Config | None = None
    _master_fd: int | None = None
    _process: Process | None = None

    @classmethod
    def set_config(cls, new_config: Any) -> bool: # pyright: ignore[reportExplicitAny, reportAny]
        """Set the config of the builder"""
        try:
            cls._config = TypeAdapter(Config).validate_python(new_config)
            return True
        except(ValidationError):
            return False

    @classmethod
    def process_is_running(cls) -> bool:
        """Check if a process is already running
        
        Returns.
            bool: Is a process currently running?
        """
        if cls._process is None:
            return False
        else:
            return True

    @staticmethod
    def check_health() -> bool:
        """Check every requirement

        Returns:
            bool: Is the builder healthy?
        """
        return shutil.which("cachix") is not None

    @classmethod
    async def create_process(cls) -> None:
        """This Method creates a new process if needed"""
        if cls._process is None and cls._master_fd is None and not cls._config is None:
            cls._master_fd, slave_fd = openpty()

            # Start process on pty
            cls._process = await asyncio.create_subprocess_exec(
                cls._config["command"][0], *cls._config["command"][1:],
                stdout=slave_fd, 
                stderr=slave_fd,
                cwd="/home/sven/GitHub/holynix"
            )

            # Close slave_fd as it is note needed anymore
            os.close(slave_fd)

    @classmethod
    async def build(cls) -> None:
        """Start the build of a derivation
        Parameters:
            websocket (WebSocket): The websocket which is used to show the stdout and stderr
        """

        # Check if config is present
        if cls._config is None:
            await ConnectionManager.broadcast(PreDefinedResponse.INVALID_CONFIG())
        else:
            await ConnectionManager.broadcast(PreDefinedResponse.STARTING_BUILD())

            # Start process
            await cls.create_process()

            if not cls._process is None and not cls._master_fd is None:
                # While the process run wait for output
                # TODO: Split in stderr and stdout
                while cls._process.returncode is None:
                    try:
                        # Get each output line
                        data = await asyncio.get_event_loop().run_in_executor(
                            None, os.read, cls._master_fd, 1024
                        )
                    except OSError:
                        break

                    # Remove ASCI control sequences
                    ansi_escape = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]')
                    clean = ansi_escape.sub("", data.decode()).strip()

                    # Send lines which contain data to the client
                    if clean:
                        await ConnectionManager.broadcast(cls._gen_command_output_msg(clean))
                        clean = None

                # Check exit code of process
                if cls._process.returncode == 0:
                    await ConnectionManager.broadcast(PreDefinedResponse.BUILD_SUCCEEDED())
                else:
                    await ConnectionManager.broadcast(PreDefinedResponse.BUILD_FAILED())

        # close process and pty
        if not cls._master_fd is None:
            os.close(cls._master_fd)
        cls._process = None
        cls._master_fd = None

        # close all websockets
        ConnectionManager.disconnect_all()

    @staticmethod
    def _gen_command_output_msg(output: str) -> IgluResponse:
        """Generate a command_output IgluResponse

        Parameters:
            output (str): the output of the command

        Returns:
            IgluResponse: "invalid config" response
        """
        res = IgluResponse({
            "status_code": 200,
            "status_message": "OK",
            "data": {"msg": output},
            "is_error": False,
            "timestamp": datetime.now().isoformat()
        })

        return TypeAdapter(IgluResponse).validate_python(res)

