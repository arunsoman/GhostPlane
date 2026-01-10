import pytest
from src.agent import agent

@pytest.mark.asyncio
async def test_predictive_bottleneck_detection():
    # Synthetic metrics sequence: increasing latency + decreasing disk usage
    history = [
        {"latency": 10, "disk_usage": 100},
        {"latency": 15, "disk_usage": 80},
        {"latency": 20, "disk_usage": 60},
        {"latency": 25, "disk_usage": 40},
    ]
    
    initial_state = {
        "messages": ["Forecast any future bottlenecks"],
        "reasoning_trail": [],
        "result": None,
        "intent": "",
        "metrics_history": history
    }
    
    final_state = await agent.ainvoke(initial_state)
    
    assert "Performed predictive bottleneck analysis" in final_state["reasoning_trail"]
    assert "CRITICAL" in final_state["result"]["prediction"]
    assert final_state["result"]["confidence"] == 0.89

@pytest.mark.asyncio
async def test_predictive_stable():
    history = [
        {"latency": 10, "disk_usage": 50},
        {"latency": 10, "disk_usage": 50},
    ]
    
    initial_state = {
        "messages": ["Predict any issues"],
        "reasoning_trail": [],
        "result": None,
        "intent": "",
        "metrics_history": history
    }
    
    final_state = await agent.ainvoke(initial_state)
    assert "Stable" in final_state["result"]["prediction"]

@pytest.mark.asyncio
async def test_predictive_empty_history():
    initial_state = {
        "messages": ["Predict any issues"],
        "reasoning_trail": [],
        "result": None,
        "intent": "",
        "metrics_history": []
    }
    
    final_state = await agent.ainvoke(initial_state)
    assert "Standard operating levels" in final_state["result"]["prediction"]

@pytest.mark.asyncio
async def test_predictive_latency_only():
    history = [
        {"latency": 10, "disk_usage": 50},
        {"latency": 20, "disk_usage": 50},
    ]
    initial_state = {
        "messages": ["Predict any issues"],
        "reasoning_trail": [],
        "result": None,
        "intent": "",
        "metrics_history": history
    }
    
    final_state = await agent.ainvoke(initial_state)
    assert "WARNING: Latency trending upwards" in final_state["result"]["prediction"]
