from dataclasses import dataclass, field, asdict
from typing import Any
from datetime import datetime


@dataclass
class WsResponse:
    """Type of a websocket response"""

    status_code: int
    status_message: str
    is_error: bool
    data: dict[Any, Any]
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
