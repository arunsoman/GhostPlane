import pytest
from unittest.mock import AsyncMock, patch
from src.tools.rca import analyze_slow_endpoint, analyze_errors

@pytest.mark.asyncio
@patch("src.tools.rca.get_service_metrics", new_callable=AsyncMock)
@patch("src.tools.rca.get_logs", new_callable=AsyncMock)
async def test_analyze_slow_endpoint_high_error(mock_logs, mock_metrics):
    mock_metrics.return_value = {"error_rate": 0.1}
    mock_logs.return_value = [{"msg": "error"}]
    
    result = await analyze_slow_endpoint("/test")
    assert "High error rate" in result["root_cause"]
    assert result["confidence"] == 0.85

@pytest.mark.asyncio
@patch("src.tools.rca.get_service_metrics", new_callable=AsyncMock)
@patch("src.tools.rca.get_logs", new_callable=AsyncMock)
async def test_analyze_slow_endpoint_normal(mock_logs, mock_metrics):
    mock_metrics.return_value = {"error_rate": 0.01}
    mock_logs.return_value = []
    
    result = await analyze_slow_endpoint("/test")
    assert "Latency within normal bounds" in result["root_cause"]
    assert result["confidence"] == 0.6

@pytest.mark.asyncio
@patch("src.tools.rca.get_logs", new_callable=AsyncMock)
async def test_analyze_errors_found(mock_logs):
    mock_logs.return_value = [{"msg": "Error 500"}]
    
    result = await analyze_errors(500)
    assert "Found 1 logs" in result["root_cause"]
    assert result["confidence"] == 0.9

@pytest.mark.asyncio
@patch("src.tools.rca.get_logs", new_callable=AsyncMock)
async def test_analyze_errors_not_found(mock_logs):
    mock_logs.return_value = [{"msg": "Other info"}]
    
    result = await analyze_errors(404)
    assert "No logs found" in result["root_cause"]
    assert result["confidence"] == 0.4
