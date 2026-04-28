from typing import NotRequired, Required, TypedDict
from git import PathLike
from pydantic import HttpUrl


class JobRepo(TypedDict):
    """Type of build job repository config"""

    url: Required[PathLike]
    branch: NotRequired[str]


class JobCache(TypedDict):
    """Type of build job cache config"""

    signing_key: Required[str]
    url: Required[HttpUrl]
    auth_token: Required[str]


class Job(TypedDict):
    """Type of a build job"""

    command: Required[list[str]]
    repo: NotRequired[JobRepo]
    cache: NotRequired[JobCache]
