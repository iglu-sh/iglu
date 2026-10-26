#!/usr/bin/env python

from dataclasses import dataclass
import json
import subprocess
from fastapi._compat import Undefined
import tomlkit

from dotenv import load_dotenv
import os
from argparse import ArgumentTypeError, Namespace, ArgumentParser
import requests
from packaging.version import Version, InvalidVersion
from typing import TypedDict, cast
from glob import glob
from pydantic import TypeAdapter, ValidationError

DOCS_RELEASE_NOTES_PATH = "./docs/docs/04-versions"


@dataclass
class Args(Namespace):
    version: Version


def get_cur_version() -> Version:
    """Returns the current Iglu version from GitHub.

    Returns:
        Version: the current version of Iglu.

    Raises:
        InvalidVersion: If the fetched version is no valid version.
    """

    print("Fetching current version from GitHub...")
    url = "https://api.github.com/repos/iglu-sh/iglu/releases/latest"
    res = requests.get(url)
    body = cast(dict[str, str], res.json())
    version_str = str(body["tag_name"]).replace("v", "")
    version = Version(version_str)

    return version


def check_version_syntax(value: str) -> Version | None:
    """Returns the checked value as Version.

    Parameters:
        value (str): the version which should be checked.

    Raises:
        ArgumentTypeError: if the version is not valid.
    """
    error_msg = ""
    v_value = None
    try:
        v_value = Version(value)
    except InvalidVersion:
        error_msg = f"{value} has to be a valid version number (e.g. 1.2.3)"

    if error_msg != "":
        raise ArgumentTypeError(error_msg)

    return v_value


def check_version_value(old_version, new_version) -> None:
    """Checks if the new version is higher than the old version.

    Parameters:
        old_version (Version): the old version of Iglu to compare against.
        new_version (Version): the new version of Iglu.

    Raises:
        ArgumentTypeError: if the version is not higher than the old one.
    """
    if old_version > new_version:
        raise ArgumentTypeError(
            f"{new_version} is lower then current version ({old_version})"
        )


def parse_parameters() -> Args:
    """Returns the parsed parameters."""
    parser = ArgumentParser()
    _ = parser.add_argument(
        "version", help="new version number", type=check_version_syntax
    )
    args = cast(Args, parser.parse_args())
    return args


def load_check_env() -> None:
    """load the environment variables from .env."""
    _ = load_dotenv()
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

    if not GITHUB_TOKEN:
        print("You have to set GITHUB_TOKEN")
        exit(1)


def get_relase_info(old_version: Version, new_version: Version) -> str:
    """Get the generated release info from GitHub.

    Parameters:
        old_version (Version): the old version of Iglu to compare against.
        new_version (Version): the new version of Iglu.

    Returns:
        str: the generated release notes.
    """
    url = f"https://api.github.com/repos/iglu-sh/iglu/releases/generate-notes"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {os.getenv("GITHUB_TOKEN")}",
        "X-GitHub-Api-Version": "2026-03-10",
    }
    data = {
        "tag_name": f"v{new_version}",
        "target_commitish": "main",
        "previous_tag_name": f"v{old_version}",
    }
    print("Fetching release information from GitHub...")
    res = requests.post(url, headers=headers, json=data)
    body = cast(dict[str, str], res.json())
    info = str(body["body"])

    return info


def update_toml_version(new_version: Version, file: str) -> None:
    """Update the version in a toml file.

    Parameters:
        new_version: new version, which should be written into file.
    """

    class PyProjectVersion(TypedDict):
        version: str

    class PyProject(TypedDict):
        project: PyProjectVersion

    adapter = TypeAdapter(PyProject)
    pyproject: PyProject

    with open(file, "r", encoding="utf-8") as f:
        data = tomlkit.loads(f.read())

        try:
            pyproject = adapter.validate_python(data, extra="allow")
        except ValidationError as e:
            return

    pyproject["project"]["version"] = str(new_version)

    with open(file, "w", encoding="utf-8") as f:
        _ = f.write(tomlkit.dumps(pyproject))


def update_json_version(new_version: Version, file: str) -> None:
    """Update the version in a json file.

    Parameters:
        new_version: new version, which should be written into file.
    """

    class PackageJSON(TypedDict):
        version: str

    adapter = TypeAdapter(PackageJSON)
    package_json: PackageJSON

    with open(file, "r", encoding="utf-8") as f:
        data = json.loads(f.read())  # pyright: ignore[reportAny]

        try:
            package_json = adapter.validate_python(data, extra="allow")
        except ValidationError as e:
            return

    package_json["version"] = str(new_version)

    with open(file, "w", encoding="utf-8") as f:
        _ = f.write(json.dumps(package_json, indent=4))


def update_package_metadata(new_version: Version) -> None:
    """Upates the version in metadata of package.json and pyproject.toml.

    Parameters:
        new_version (Version): New version.
    """
    # find all files
    files = glob("**/package.json", recursive=True)
    files += glob("**/pyproject.toml", recursive=True)

    # remove unneeded
    files[:] = [f for f in files if "node_modules" not in f and "result" not in f]

    for file in files:
        print(f"Updating version in: {file}")
        if "json" in file:
            update_json_version(new_version, file)
        elif "toml" in file:
            update_toml_version(new_version, file)


def get_sidebar_position() -> int:
    """Returns the new sidebar position.

    Returns:
        int: new sidebar position.
    """

    files = glob(f"{DOCS_RELEASE_NOTES_PATH}/v*.mdx", recursive=True)
    files.sort()
    if len(files) == 0:
        raise Exception("Could not find any version doc file.")

    highest_version = files[-1]
    sidebar_position = 1
    with open(highest_version, "r") as file:
        for line in file:
            if "sidebar_position" in line:
                sidebar_position = int(line.split(" ")[-1]) - 1

    if sidebar_position == 1:
        raise Exception(f"Could not find highest sidebar_position in {highest_version}")

    return sidebar_position


def create_release_info_doc(
    info: str, new_version: Version, sidebar_position: int
) -> None:
    """Creates the release info doc page.

    Parameters:
        info (str): the github information for the new release.
        new_version (Version): new version for which the doc page should be created.
        sidebar_position (int): sidebar position of the new doc page.
    """
    DOCS_TEMPLATE = f"""
---
title: v{new_version}
slug: v{new_version}
sidebar_position: {sidebar_position}
---

## Meta Information
- Link to GitHub release: [GitHub](https://github.com/iglu-sh/iglu/release/tag/v{new_version})

---
## Original GitHub Release
TODO: Write Short release information

{info}
    """

    print(f"Creating {DOCS_RELEASE_NOTES_PATH}/v{new_version}.mdx")
    with open(
        f"{DOCS_RELEASE_NOTES_PATH}/v{new_version}.mdx", "w", encoding="utf-8"
    ) as file:
        _ = file.write(DOCS_TEMPLATE)


def generate_open_api_docs() -> None:
    """Generate openapi specs and doc pages."""

    commands = [
        ["bun", "run", "cache::openapi::generate"],
        ["bun", "run", "docs::clean::specs"],
        ["bun", "run", "docs::generate::specs"],
    ]
    for command in commands:
        print(f"Running: {" ".join(command)}")
        result = subprocess.run(
            command,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode != 0:
            raise Exception(
                f"{" ".join(command)} exited with exit code {result.returncode}\n{result.stderr}"
            )


def tag_docs_version(new_version: Version) -> None:
    """Tag the docs with the new version.

    Parameters:
        new_version (Version): new Iglu version.
    """
    print(f"Tagging docs...")
    command = ["bun", "run", "docs::tag::version", f"v{new_version}"]

    result = subprocess.run(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    if result.returncode != 0:
        raise Exception(
            f"{" ".join(command)} exited with exit code {result.returncode}\n{result.stderr}"
        )


def run_biome_format() -> None:
    """Run biome fomrate --write."""

    print(f"Run biomejs...")
    command = ["bun", "biome", "format", "--write"]

    result = subprocess.run(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    if result.returncode != 0:
        raise Exception(
            f"{" ".join(command)} exited with exit code {result.returncode}\n{result.stderr}"
        )


def print_todos(new_version: Version) -> None:
    """Print tasks which have to be done manually.

    Parameters:
        new_version (Version): new Iglu version.
    """
    print()
    print()
    print(
        "################################### Manual Tasks ###################################"
    )
    print()
    print(
        f"# 1. Please add the update information into {DOCS_RELEASE_NOTES_PATH}/v{new_version}.mdx"
    )
    print()
    print(
        "######################################################################################"
    )


def main() -> None:
    args = parse_parameters()
    new_version = args.version
    load_check_env()

    old_version = get_cur_version()
    check_version_value(old_version, new_version)
    info = get_relase_info(old_version, new_version)

    update_package_metadata(args.version)

    sidebar_position = get_sidebar_position()
    create_release_info_doc(info, new_version, sidebar_position)

    generate_open_api_docs()
    tag_docs_version(new_version)

    run_biome_format()

    print_todos(new_version)


main()
