import asyncio
from asyncio.subprocess import Process
from datetime import datetime
import functools
import os
from pathlib import Path
from pty import openpty
import re
import shutil
from typing import Any

from jinja2 import FileSystemLoader, Environment

from git import InvalidGitRepositoryError, NoSuchPathError, Repo
from pydantic import TypeAdapter

from app.connection_manager import ConnectionManager
from app.types import Config, IgluResponse
from app.types import PreDefinedResponse

class Builder:
    """This class provides all functinality to build and push derivations"""
    _config: Config | None = None
    _master_fd: int | None = None
    _process: Process | None = None

    @classmethod
    async def set_config(cls, new_config: Any) -> bool: # pyright: ignore[reportExplicitAny, reportAny]
        """Set the config of the builder"""
        try:
            tmp_config = TypeAdapter(Config).validate_python(new_config)

            _ = tmp_config.setdefault("cwd", Path("/tmp/iglu_builder"))

            # Check more then the type
            if len(tmp_config["command"]) < 2:
                raise Exception("Command needs at least one argument")

            if not tmp_config["command"][0] in ["nix", "nix-build"]:
                raise Exception("Command has to start with \"nix\" or \"nix-build\"")

            if tmp_config["repo"].get("url") in ["", None] and tmp_config["repo"]["clone"]:
                raise Exception("If you set repo.clone == True you also need to set repo.url")

            if tmp_config["cache"]["push"] and (tmp_config["cache"].get("url") is None or tmp_config["cache"].get("auth_token") is None or tmp_config["cache"].get("signing_key") is None):
                raise Exception("If you set cache.push == True you also need to set cache.url, cache.auth_token, cache.signing_key")

            cls._config = tmp_config
            return True
        except Exception as e:
            await ConnectionManager.broadcast(PreDefinedResponse.INVALID_CONFIG(repr(e)))
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
        cachix_is_installed = shutil.which("cachix") is not None
        nix_is_installed = shutil.which("nix") is not None
        nix_build_is_installed = shutil.which("nix-build") is not None
        return cachix_is_installed and nix_build_is_installed and nix_is_installed

    @classmethod
    async def _create_process(cls) -> None:
        """This Method creates a new process if needed"""
        if cls._process is None and cls._master_fd is None and not cls._config is None:
            cls._master_fd, slave_fd = openpty()

            if cls._config["cache"]["push"]:
                cache_name = str(cls._config["cache"].get("url")).split("/")[-1]
                cls._config["command"][:0] = ["cachix", "-c", "cachix.dhall", "watch-exec", cache_name, "--"]

            # Start process on pty
            cls._process = await asyncio.create_subprocess_exec(
                cls._config["command"][0], *cls._config["command"][1:],
                stdout=slave_fd, 
                stderr=slave_fd,
                cwd=cls._config.get("cwd")
            )

            # Close slave_fd as it is note needed anymore
            os.close(slave_fd)

    @classmethod
    async def _prepare_cachix_config(cls) -> None:
        """Prepare the cachix.dhall file"""
        if cls._config is None:
            return

        # Prepare cachix config with jinja template
        jinja_env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__) ,"../templates")))
        template = jinja_env.get_template("cachix.dhall.j2")
        data = {
            "auth_token": cls._config["cache"].get("auth_token"),
            "url": cls._config["cache"].get("url"),
            "name": str(cls._config["cache"].get("url")).split("/")[-1],
            "signing_key": cls._config["cache"].get("signing_key")
        }
        cachix_config = template.render(data)

        # Write cachix.dhall
        with open(os.path.join(str(cls._config.get("cwd")), "cachix.dhall"), "w") as f:
            _ = f.write(cachix_config)

    @classmethod
    async def _clone(cls) -> None:
        """Clone/Pull a repository"""

        # Early Return if Config is None
        if cls._config is None:
            return

        url = cls._config["repo"].get("url")
        cwd = cls._config.get("cwd")
        branch = cls._config["repo"].get("branch")
        repo = None
        is_pulled = False

        # Early Return if cwd or url is None
        if cwd is None or url is None:
            return


        # Try to pull repository
        try:
            repo = Repo(cwd)

            # Get default branch name
            branch = branch if branch else repo.remotes.origin.refs.HEAD.ref.remote_head

            is_right_branch = bool(branch == repo.active_branch.name and not branch)
            is_right_repo = url == repo.remotes.origin.url

            # Only pull if origin url and branch name are the same
            if is_right_branch and is_right_repo:
                _ = repo.remotes.origin.pull(branch)
                is_pulled = True
        # If this Exceptions appear a pull is not possible or invalid
        except (NoSuchPathError, InvalidGitRepositoryError):
            pass
        finally:
            # Clone repository if not already pulled
            if not is_pulled:

                # Clear directory if needed
                if cwd.is_dir():
                    shutil.rmtree(cwd)
                
                # Create directory
                cwd.mkdir()

                # Prepare clone function
                if branch:
                    func = functools.partial(Repo.clone_from, url, cwd, branch=branch)
                else:
                    func = functools.partial(Repo.clone_from, url, cwd)

                # Execute clone
                _ = await asyncio.get_event_loop().run_in_executor(
                    None,  func,
                )

    @classmethod
    async def build(cls) -> None:
        """Start the build of a derivation
        Parameters:
            websocket (WebSocket): The websocket which is used to show the stdout and stderr
        """

        # Check if config is present
        if cls._config is None:
            return
        else:
            await ConnectionManager.broadcast(PreDefinedResponse.STARTING_BUILD())

            # Cloen repo if needed
            if cls._config["repo"]["clone"]:
                await cls._clone()

            if cls._config["cache"]["push"]:
                await cls._prepare_cachix_config()

            # Start process
            await cls._create_process()

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
            IgluResponse: "command_output" response
        """
        res = IgluResponse({
            "status_code": 200,
            "status_message": "OK",
            "data": {"msg": output},
            "is_error": False,
            "timestamp": datetime.now().isoformat()
        })

        return TypeAdapter(IgluResponse).validate_python(res)

