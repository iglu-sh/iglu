from datetime import datetime
from app.types import WsResponse
from pydantic import TypeAdapter

def gen_invalid_config() -> WsResponse:
    """Generate an "invalid config" websocket response

    Returns:
        WsResponse: "invalid config" response
    """
    response = {
        "status_code":  400,
        "status_message": "Bad Request",
        "data": {"msg": "The given config is invalid"},
        "is_error": True,
        "timestamp": datetime.now().isoformat()
    }

    return TypeAdapter(WsResponse).validate_python(response)

def gen_command_output(output: str) -> WsResponse:
    """Generate an "command output" websocket response

    Returns:
        WsResponse: "command output" response
    """
    response = {
        "status_code": 200,
        "status_message": "OK",
        "data": {"msg": output},
        "is_error": False,
        "timestamp": datetime.now().isoformat()
    }

    return TypeAdapter(WsResponse).validate_python(response)

def gen_build_failed() -> WsResponse:
    """Generate an "build failed" websocket response

    Returns:
        WsResponse: "build failed" response
    """
    response = {
        "status_code": 500,
        "status_message": "Internal Server Error",
        "data": {"msg": "The build failed"},
        "is_error": True,
        "timestamp": datetime.now().isoformat()
    }

    return TypeAdapter(WsResponse).validate_python(response)

def gen_build_succeeded() -> WsResponse:
    """Generate an "build succeeded" websocket response

    Returns:
        WsResponse: "build succeeded" response
    """
    response = {
        "status_code": 200,
        "status_message": "OK",
        "data": {"msg": "The build finished successful"},
        "is_error": False,
        "timestamp": datetime.now().isoformat()
    }

    return TypeAdapter(WsResponse).validate_python(response)
