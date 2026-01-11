from typing import TypedDict, List, Union
from langgraph.graph import StateGraph, END
from .tools.metrics import get_service_metrics
from .tools.logs import get_logs
from .tools.rca import analyze_slow_endpoint
from .tools.predictive import predict_bottleneck

class AgentState(TypedDict):
    """State for the Copilot agent."""
    messages: List[str]
    intent: str
    result: Union[dict, str]
    reasoning_trail: List[str]
    metrics_history: List[dict] # Added for predictive context

async def call_rca(state: AgentState):
    """Tool node for Root Cause Analysis."""
    prompt = state["messages"][-1]
    res = await analyze_slow_endpoint(prompt)
    return {
        "result": res,
        "reasoning_trail": state["reasoning_trail"] + ["Performed RCA analysis"]
    }

async def call_status(state: AgentState):
    """Tool node for checking system status."""
    metrics = await get_service_metrics()
    return {
        "result": metrics,
        "reasoning_trail": state["reasoning_trail"] + ["Fetched real-time metrics"]
    }

async def call_predictive(state: AgentState):
    """Tool node for predictive analytics."""
    history = state.get("metrics_history", [])
    prediction = await predict_bottleneck(history)
    return {
        "result": prediction,
        "reasoning_trail": state["reasoning_trail"] + ["Performed predictive bottleneck analysis"]
    }

def route_request(state: AgentState):
    """Conditional router based on user prompt."""
    prompt = state["messages"][-1].lower()
    if "predict" in prompt or "future" in prompt or "forecast" in prompt:
        return "predictive"
    if "why" in prompt or "slow" in prompt or "error" in prompt:
        return "rca"
    if "status" in prompt or "metrics" in prompt or "health" in prompt:
        return "status"
    return END

def build_graph():
    """Build the LangGraph workflow."""
    workflow = StateGraph(AgentState)
    
    workflow.add_node("rca", call_rca)
    workflow.add_node("status", call_status)
    workflow.add_node("predictive", call_predictive)
    
    workflow.set_conditional_entry_point(
        route_request,
        {
            "rca": "rca",
            "status": "status",
            "predictive": "predictive",
            END: END
        }
    )
    
    workflow.add_edge("rca", END)
    workflow.add_edge("status", END)
    workflow.add_edge("predictive", END)
    
    return workflow.compile()

# Singleton instance
agent = build_graph()
