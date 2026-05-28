import asyncio
from dataclasses import dataclass
import json
from typing import Dict, NotRequired, TypedDict, Any

from iglu_builder.ConfigManager import Config

import platform
import sys
import os


@dataclass
class Flake(TypedDict):
    """Type of a Flake"""

    devShells: NotRequired[Dict[str, Any]]
    packages: NotRequired[Dict[str, Any]]
    nixosConfigurations: NotRequired[Dict[str, Any]]


class NixHelper:
    _conf: Config

    def __init__(self, conf: Config) -> None:
        """Create a NixHelper"""
        self._conf = conf

    async def _load_flake(self) -> Flake:
        """Load flake and convert to dictionary"""
        process = await asyncio.create_subprocess_exec(
            "nix",
            "flake",
            "show",
            "--json",
            "--all-systems",
            self._conf["builder"]["work_dir"],
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _stderr = await process.communicate()

        flake = json.loads(stdout.decode())

        return flake

    def _get_architectures(self) -> list[str]:
        """Get all available build architectures"""
        binfmt_dir = "/proc/sys/fs/binfmt_misc"
        status_file = f"{binfmt_dir}/status"

        os_platform = sys.platform
        os_arch = platform.machine()

        host_arch = f"{os_arch}-{os_platform}"

        # Check for cross compiling
        if os.path.exists(status_file):
            with open(status_file, "r") as f:
                status = f.read().strip()
            if status == "enabled":
                files = os.listdir(binfmt_dir)
                files.remove("register")
                files.remove("status")
                return files + [host_arch]

        return [host_arch]

    async def get_all_systems(self) -> list[str] | None:
        """Get the name of all systems in flake"""
        flake = await self._load_flake()
        if not "nixosConfigurations" in flake:
            return None

        return list(flake["nixosConfigurations"].keys())

    async def get_all_packages(self) -> list[str] | None:
        """Get the name of all packages in flake"""
        flake = await self._load_flake()
        arches = self._get_architectures()
        if not "packages" in flake:
            return None

        package_list: list[str] = []
        for arch in flake["packages"]:
            if arch in arches:
                for package in flake["packages"][arch]:
                    package_list.append(f"packages.{arch}.{package}")

        return package_list
