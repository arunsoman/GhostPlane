import pytest
import httpx
import respx
from src.tools.logs import get_logs

@pytest.mark.asyncio
@respx.mock
async def test_get_logs_success():
    mock_response = [
        {"timestamp": "2024-01-01T00:00:00Z", "action": "login"},
        {"timestamp": "2024-01-01T00:00:01Z", "action": "logout"}
    ]
    respx.get("http://localhost:8081/api/logs").mock(return_value=httpx.Response(200, json=mock_response))

    result = await get_logs()
    assert result == mock_response

@pytest.mark.asyncio
@respx.mock
async def test_get_logs_failure():
    respx.get("http://localhost:8081/api/logs").mock(side_effect=httpx.HTTPError("Connection failed"))

    result = await get_logs()
    assert "error" in result[0]
    assert "Connection failed" in result[0]["error"]
