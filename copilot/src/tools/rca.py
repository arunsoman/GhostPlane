import os
from .metrics import get_service_metrics
from .logs import get_logs

async def analyze_slow_endpoint(endpoint: str) -> dict:
    """
    Perform RCA for a slow endpoint by correlating metrics and logs.
    """
    metrics = await get_service_metrics()
    logs = await get_logs()
    
    # In a real implementation, we would send these to the LLM
    # For Sprint 2, we simulate the LLM's reasoning
    
    error_rate = metrics.get("error_rate", 0)
    
    if error_rate > 0.05:
        return {
            "root_cause": "High error rate detected in backends. Correlating logs...",
            "details": f"Error rate: {error_rate*100}%. Recent logs: {len(logs)} entries.",
            "suggested_fix": "Investigate backend health and potential database connection issues.",
            "confidence": 0.85
        }
    
    return {
        "root_cause": "Latency within normal bounds, but slightly elevated p99.",
        "details": "Checking for potential resource contention.",
        "suggested_fix": "Enable adaptive caching for frequent queries.",
        "confidence": 0.6
    }

async def analyze_errors(error_code: int) -> dict:
    """Perform RCA for error responses."""
    logs = await get_logs()
    
    relevant_logs = [l for l in logs if str(error_code) in str(l)]
    
    if relevant_logs:
        return {
            "root_cause": f"Found {len(relevant_logs)} logs related to error {error_code}.",
            "suggested_fix": "Check the specific downstream service causing these logs.",
            "confidence": 0.9
        }
    
    return {
        "root_cause": "No logs found matching this error code.",
        "suggested_fix": "Enable more verbose logging for correlation.",
        "confidence": 0.4
    }
