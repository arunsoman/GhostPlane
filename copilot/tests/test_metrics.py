import pytest
import httpx
import respx
from src.tools.metrics import get_service_metrics

@pytest.mark.asyncio
@respx.mock
async def test_get_service_metrics_success():
    mock_response = {
        "active_connections": 150,
        "requests_per_second": 45.5,
        "backends": []
    }
    respx.get("http://localhost:8081/api/metrics").mock(return_value=httpx.Response(200, json=mock_response))

    result = await get_service_metrics()
    assert result == mock_response

@pytest.mark.asyncio
@respx.mock
async def test_get_service_metrics_failure():
    respx.get("http://localhost:8081/api/metrics").mock(side_effect=httpx.HTTPError("Connection failed"))

    result = await get_service_metrics()
    assert "error" in result
    assert "Connection failed" in result["error"]
