from datetime import datetime
from pathlib import Path
from typing import Any, NotRequired, Required, TypedDict

class RepoConfig(TypedDict):
    """Type of builder configs repo attribute"""
    clone: Required[bool]
    url: NotRequired[str]
    branch: NotRequired[str]

class CacheConfig(TypedDict):
    """Type of builder config cache attribute"""
    push: Required[bool]
    signing_key: NotRequired[str]
    url: NotRequired[str]
    auth_token: NotRequired[str]

class Config(TypedDict):
    """Type of a builder config"""
    command: Required[list[str]]
    cwd: NotRequired[Path]
    repo: Required[RepoConfig]
    cache: Required[CacheConfig]

class IgluResponse(TypedDict):
    """Type of a websocket response"""
    status_code: Required[int]
    status_message: Required[str]
    is_error: Required[bool]
    data: Required[dict[Any, Any]] # pyright: ignore[reportExplicitAny]
    timestamp: Required[datetime|str]

class PreDefinedResponse:
    @staticmethod
    def INVALID_CONFIG(e: str) -> IgluResponse:
        return IgluResponse({
            "status_code":  400,
            "status_message": "Bad Request",
            "data": {"msg": e},
            "is_error": True,
            "timestamp": datetime.now().isoformat()
        })

    @staticmethod
    def BUILD_FAILED() -> IgluResponse:
        return IgluResponse({
            "status_code": 500,
            "status_message": "Internal Server Error",
            "data": {"msg": "The build failed"},
            "is_error": True,
            "timestamp": datetime.now().isoformat()
        })

    @staticmethod
    def BUILD_SUCCEEDED() -> IgluResponse:
        return IgluResponse({
            "status_code": 200,
            "status_message": "OK",
            "data": {"msg": "The build succeeded"},
            "is_error": True,
            "timestamp": datetime.now().isoformat()
        })

    @staticmethod
    def STARTING_BUILD() -> IgluResponse:
        return IgluResponse({
            "status_code": 200,
            "status_message": "OK",
            "data": {"msg": "Starting build"},
            "is_error": False,
            "timestamp": datetime.now().isoformat()
        })

    @staticmethod
    def HEALTHY() -> IgluResponse:
        return IgluResponse({
            "status_code": 200,
            "status_message": "OK",
            "data": {"msg": "healthy"},
            "is_error": False,
            "timestamp": datetime.now().isoformat(),
        })

    @staticmethod
    def UNHEALTHY() -> IgluResponse:
        return IgluResponse({
            "status_code": 500,
            "status_message": "Internal Server Error",
            "data": {"msg": "unhealthy"},
            "is_error": False,
            "timestamp": datetime.now().isoformat()
        })
    @staticmethod
    def INTERNAL_ERROR(e = "Something went wrong") -> IgluResponse:
        return IgluResponse({
            "status_code": 500,
            "status_message": "Internal Server Error",
            "is_error": True,
            "data": {"msg": e},
            "timestamp": datetime.now().isoformat()
        })
