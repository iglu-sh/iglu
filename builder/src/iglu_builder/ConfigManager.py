from dataclasses import dataclass
import tomllib
from typing import Required, TypedDict, NotRequired
from pathlib import Path
from pydantic import TypeAdapter

from iglu_builder.types.Job import JobCache


@dataclass
class ServerConfig(TypedDict):
    """Config secion [server] Class"""

    host: Required[str]
    port: Required[int]
    dev_mode: Required[bool]


@dataclass
class BuilderConfig(TypedDict):
    """Config section [builder] Class"""

    work_dir: Required[Path]
    allowed_commands: Required[list[str]]
    cache: NotRequired[JobCache]


@dataclass
class Config(TypedDict):
    """Config Class"""

    server: Required[ServerConfig]
    builder: Required[BuilderConfig]


class ConfigManager:
    _path: Path
    _conf: Config

    def __init__(self, path: Path) -> None:
        self._path = path
        self._reload()

    def _reload(self) -> None:
        """Reload the config from the given _path"""

        # Load toml config
        try:
            with open(self._path, "rb") as file:
                toml = tomllib.load(file)
        except FileNotFoundError:
            toml = {}

        # Set elements if empty
        toml.setdefault("builder", {})
        toml.setdefault("server", {})

        # Set defaults
        toml["builder"].setdefault("work_dir", "/tmp/iglu_builder")
        toml["builder"].setdefault("allowed_commands", ["nix", "nix-build"])

        toml["server"].setdefault("host", "0.0.0.0")
        toml["server"].setdefault("port", 8000)
        toml["server"].setdefault("dev_mode", False)

        self._conf = TypeAdapter(Config).validate_python(toml)

    def get_conf(self) -> Config:
        return self._conf
