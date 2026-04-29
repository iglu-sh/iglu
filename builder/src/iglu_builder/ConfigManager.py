from dataclasses import dataclass
import tomllib
from typing import Required, TypedDict
from pathlib import Path
from pydantic import TypeAdapter


@dataclass
class Config(TypedDict):
    work_dir: Required[Path]
    port: Required[int]
    host: Required[str]
    dev_mode: Required[bool]
    allowed_commands: Required[list[str]]


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

        # Set default config
        tmp_conf = {
            "dev_mode": toml["server"].get("dev_mode", False),
            "port": toml["server"].get("port", 8000),
            "host": toml["server"].get("host", "0.0.0.0"),
            "work_dir": toml["builder"].get("work_dir", "/tmp/iglu_builder"),
            "allowed_commands": toml["builder"].get(
                "allowed_commands", ["nix", "nix-build"]
            ),
        }

        self._conf = TypeAdapter(Config).validate_python(tmp_conf)

    def get_conf(self) -> Config:
        return self._conf
