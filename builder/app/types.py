from enum import Enum
from typing import Any, Required, TypedDict
from datetime import datetime

class Config(TypedDict):
    """Type of a builder config"""
    command: Required[list[str]]

class WsResponse(TypedDict):
    """Type of a websocket response"""
    status_code: int
    status_message: str
    is_error: bool
    data: dict[Any, Any] # pyright: ignore[reportExplicitAny]
    timestamp: datetime|str
