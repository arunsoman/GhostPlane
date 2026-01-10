import pytest
from src.agent import agent, AgentState

@pytest.mark.asyncio
async def test_agent_rca_route():
    initial_state = {
        "messages": ["Why is it slow?"],
        "reasoning_trail": [],
        "result": None,
        "intent": ""
    }
    
    # We need to mock the tools called by nodes
    with pytest.MonkeyPatch.context() as mp:
        async def mock_rca(p): return {"root_cause": "cpu"}
        mp.setattr("src.agent.analyze_slow_endpoint", mock_rca)
        
        final_state = await agent.ainvoke(initial_state)
        assert "Performed RCA analysis" in final_state["reasoning_trail"]
        assert final_state["result"]["root_cause"] == "cpu"

@pytest.mark.asyncio
async def test_agent_status_route():
    initial_state = {
        "messages": ["Show me system status"],
        "reasoning_trail": [],
        "result": None,
        "intent": ""
    }
    
    with pytest.MonkeyPatch.context() as mp:
        async def mock_metrics(): return {"rps": 100}
        mp.setattr("src.agent.get_service_metrics", mock_metrics)
        
        final_state = await agent.ainvoke(initial_state)
        assert "Fetched real-time metrics" in final_state["reasoning_trail"]
        assert final_state["result"]["rps"] == 100

@pytest.mark.asyncio
async def test_agent_no_route():
    initial_state = {
        "messages": ["Hello"],
        "reasoning_trail": [],
        "result": None,
        "intent": ""
    }
    
    final_state = await agent.ainvoke(initial_state)
    assert final_state["result"] is None
    assert len(final_state["reasoning_trail"]) == 0
