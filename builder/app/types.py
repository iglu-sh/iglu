from typing import Any, Required, TypedDict
from datetime import datetime

class Config(TypedDict):
    """Type of a builder config"""
    command: Required[list[str]]

class IgluResponse(TypedDict):
    """Type of a websocket response"""
    status_code: int
    status_message: str
    is_error: bool
    data: dict[Any, Any] # pyright: ignore[reportExplicitAny]
    timestamp: datetime|str

class PreDefinedResponse:
    @staticmethod
    def INVALID_CONFIG() -> IgluResponse:
        return IgluResponse({
            "status_code":  400,
            "status_message": "Bad Request",
            "data": {"msg": "The given config is invalid"},
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
