from asyncio.subprocess import Process
from ntpath import abspath
import os
from pathlib import Path
import re
import functools
from git import InvalidGitRepositoryError, NoSuchPathError, Repo
from iglu_builder.ConfigManager import Config
from iglu_builder.types.Job import Job
from iglu_builder.ConnectionManager import ConnectionManager
from jinja2 import Environment, FileSystemLoader
import asyncio
import shutil
from pty import openpty

from iglu_builder.types.WsResponse import WsResponse
from iglu_builder.NixHelper import NixHelper


class Builder:
    """This class provides all functionality to build and push derivations"""

    _conf: Config
    _job: Job
    _cm: ConnectionManager

    def __init__(self, conf: Config, job: Job, cm: ConnectionManager) -> None:
        """Create a Builder
        Parameters:
            conf (Config): Config object
            job (Job): Job config object
        """
        self._conf = conf
        self._cm = cm
        self._job = job

    async def build(self) -> None:
        """Start the build process"""

        await self._clone()
        await self._prepare_cachix()
        process, stdout, stderr = await self._start_process()

        if process is None or stdout is None or stderr is None:
            return

        await asyncio.gather(
            self._get_pty_output(stdout, process, "stdout"),
            self._get_pty_output(stderr, process, "stderr"),
        )

        if process.returncode == 0:
            await self._cm.broadcast(
                WsResponse(200, "OK", False, {"msg": "Build succeeded"})
            )
        else:
            await self._cm.broadcast(
                WsResponse(
                    500, "Internal Server Error", True, {"error": "Build failed"}
                )
            )

        await process.wait()

    async def _clone(self) -> None:
        """Clone/Pull a repository"""

        # Early return if repo is None
        if not "repo" in self._job:
            await self._cm.broadcast(
                WsResponse(
                    200, "OK", False, {"msg": "No Repository given, skiping this step"}
                )
            )
            return

        await self._cm.broadcast(
            WsResponse(200, "OK", False, {"msg": "Prepare Repository"})
        )
        url = self._job["repo"].get("url")
        branch = self._job["repo"].get("branch")
        work_dir = self._conf["builder"]["work_dir"]

        # Try to pull repository
        try:
            repo = Repo(work_dir)

            # Get default baranch name if needed

            if branch is None:
                branch = repo.remotes.origin.refs.HEAD.ref.remote_head

            is_right_branch = branch == repo.active_branch.name
            is_right_repo = url == repo.remotes.origin.url

            if is_right_branch and is_right_repo:
                await asyncio.get_event_loop().run_in_executor(
                    None, repo.remotes.origin.pull, branch
                )

        except (NoSuchPathError, InvalidGitRepositoryError):
            # Clear directory if needed
            if work_dir.is_dir():
                shutil.rmtree(work_dir)

            work_dir.mkdir()

            if branch:
                func = functools.partial(Repo.clone_from, url, work_dir, branch=branch)
            else:
                func = functools.partial(Repo.clone_from, url, work_dir)

            await asyncio.get_event_loop().run_in_executor(None, func)

    async def _prepare_cachix(self) -> None:
        """Prepare the cachix.dhall file"""

        # If job has cache options use them, else use the one from the config.toml
        if "cache" in self._job:
            cache = self._job["cache"]
        elif "cache" in self._conf["builder"]:
            cache = self._conf["builder"]["cache"]
        else:
            await self._cm.broadcast(
                WsResponse(
                    200, "OK", False, {"msg": "No cache given, skipping this step"}
                )
            )
            return

        await self._cm.broadcast(
            WsResponse(200, "OK", False, {"msg": "Prepare cachix.dhall"})
        )

        # Prepare cachix config with jinja template
        jinja_env = Environment(
            loader=FileSystemLoader(
                os.path.join(os.path.dirname(__file__), "templates")
            )
        )
        template = jinja_env.get_template("cachix.dhall.j2")
        data = {
            "auth_token": cache.get("auth_token"),
            "url": "/".join(str(cache.get("url")).split("/")[:-1]) + "/",
            "name": str(cache.get("url")).split("/")[-1],
            "signing_key": cache.get("signing_key"),
        }
        cachix_config = template.render(data)

        # Write cachix.dhall
        with open(
            os.path.join(self._conf["builder"]["work_dir"], "cachix.dhall"), mode="w"
        ) as f:
            await asyncio.get_event_loop().run_in_executor(None, f.write, cachix_config)

    async def _start_process(self):
        stdout, client_stdout = openpty()
        stderr, client_stderr = openpty()

        await self._cm.broadcast(
            WsResponse(200, "OK", False, {"msg": "Starting build"})
        )

        command: list[str]
        nixHelper = NixHelper(self._conf)
        current_path = str(Path(__file__).parent)

        # Build with custom command
        if "command" in self._job:
            command = self._job["command"]

        # Build all systems
        elif "all_systems" in self._job:
            systems = await nixHelper.get_all_systems()
            if systems is None:
                return (None, None, None)
            command = [f"{current_path}/scripts/all_systems.sh"] + systems

        # Build all packages
        elif "all_packages" in self._job:
            packages = await nixHelper.get_all_packages()
            if packages is None:
                return (None, None, None)
            command = [f"{current_path}/scripts/all_packages.sh"] + packages
        else:
            return (None, None, None)

        # Add cachix options if needed
        if "cache" in self._job:
            command[:0] = (
                f"cachix -c cachix.dhall watch-exec {str(self._job["cache"].get("url")).split("/")[-1]} --".split(
                    " "
                )
            )

        # Start the process
        process = await asyncio.create_subprocess_exec(
            command[0],
            *command[1:],
            stdout=client_stdout,
            stderr=client_stderr,
            cwd=self._conf["builder"]["work_dir"],
        )

        # Close the unused fds
        os.close(client_stdout)
        os.close(client_stderr)

        return (process, stdout, stderr)

    async def _get_pty_output(self, pty: int, process: Process, type: str) -> None:
        while process.returncode is None:
            try:
                data = await asyncio.get_event_loop().run_in_executor(
                    None, os.read, pty, 1024
                )
                # Remove ASCI control sequences
                ansi_escape = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]")
                clean = ansi_escape.sub("", data.decode()).strip()

                if clean:
                    await self._cm.broadcast(
                        WsResponse(200, "OK", False, {"stream": type, "output": clean})
                    )

            except OSError:
                # The PTY could be closed while the subprocess is still existing
                # this ignores read errors
                pass
