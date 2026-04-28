from asyncio.subprocess import Process
import os
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


class Builder:
    """This class provides all functinality to build and push derivations"""

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
        work_dir = self._conf["work_dir"]

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

        if "cache" not in self._job:
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
            "auth_token": self._job["cache"].get("auth_token"),
            "url": self._job["cache"].get("url"),
            "name": "default",
            "signing_key": self._job["cache"].get("signing_key"),
        }
        cachix_config = template.render(data)

        # Write cachix.dhall
        with open(os.path.join(self._conf["work_dir"], "cachix.dhall"), mode="w") as f:
            await asyncio.get_event_loop().run_in_executor(None, f.write, cachix_config)

    async def _start_process(self):
        stdout, slave_stdout = openpty()
        stderr, slave_stderr = openpty()

        await self._cm.broadcast(
            WsResponse(200, "OK", False, {"msg": "Starting build"})
        )

        # Add cachix options if needed
        if "cache" in self._job:
            self._job["command"][:0] = (
                "cachix -c cachix.dhall watch-exec default --".split(" ")
            )

        # Start the process
        process = await asyncio.create_subprocess_exec(
            self._job["command"][0],
            *self._job["command"][1:],
            stdout=slave_stdout,
            stderr=slave_stderr,
            cwd=self._conf["work_dir"]
        )

        # Close the unused fds
        os.close(slave_stdout)
        os.close(slave_stderr)

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
