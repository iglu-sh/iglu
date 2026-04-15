import shutil
import asyncio
import os
from fastapi import WebSocket
from pty import openpty
import re
from app.types import Config
import app.msg as msg

class Builder:
    """This class provides all functinality to build and push derivations"""

    _config: Config | None = None

    @classmethod
    def set_config(cls, new_config: Config) -> None:
        """Set the config of the builder"""
        cls._config = new_config

    @staticmethod
    def check_health() -> bool:
        """Check every requirement

        Returns:
            bool: Is the builder healthy?
        """
        return shutil.which("cachix") is not None

    @classmethod
    async def build(cls, websocket: WebSocket) -> None:
        """Start the build of a derivation
        Parameters:
            websocket (WebSocket): The websocket which is used to show the stdout and stderr
        """
        if cls._config is None:
            await websocket.send_text("No config set!")
        else:
            await websocket.send_text("Build is starting...")

            # Create pty
            master_fd, slave_fd = openpty()

            # Start process on pty
            process = await asyncio.create_subprocess_exec(
                cls._config["command"][0], *cls._config["command"][1:],
                stdout=slave_fd, 
                stderr=slave_fd,
                cwd="/home/sven/GitHub/holynix"
            )

            # Close slave_fd as it is note needed anymore
            os.close(slave_fd)

            while process.returncode is None:
                try:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, os.read, master_fd, 1024
                    )
                except OSError:
                    break

                # Remove ASCI control sequences
                ansi_escape = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]')
                clean = ansi_escape.sub("", data.decode()).strip()

                if clean:
                    await websocket.send_json(msg.gen_command_output(clean))

            if process.returncode == 0:
                await websocket.send_json(msg.gen_build_succeeded())
            else:
                await websocket.send_json(msg.gen_build_failed())

        await websocket.close()


