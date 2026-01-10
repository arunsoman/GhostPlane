from typing import List, Dict

async def predict_bottleneck(metrics_history: List[Dict]) -> Dict:
    """
    Analyzes historical metrics to predict future bottlenecks.
    Simulates a linear regression or trend analysis.
    """
    if not metrics_history:
        return {"prediction": "Standard operating levels", "confidence": 1.0}
        
    # Example logic: Look at latency trend
    latencies = [m.get("latency", 0) for m in metrics_history]
    disk_usage = [m.get("disk_usage", 0) for m in metrics_history]
    
    # Check for increasing latency (strictly more at the end than at the start)
    is_lat_increasing = latencies[-1] > latencies[0]
    # Check for decreasing disk space (strictly less at the end than at the start)
    is_disk_decreasing = disk_usage[-1] < disk_usage[0]
    
    if is_lat_increasing and is_disk_decreasing:
        return {
            "prediction": "CRITICAL: Potential outage in 15 minutes due to disk exhaustion driving swap latency.",
            "confidence": 0.89,
            "action": "Scale disk or purge logs."
        }
    
    if is_lat_increasing:
        return {
            "prediction": "WARNING: Latency trending upwards. Expected threshold breach in 2 hours.",
            "confidence": 0.75,
            "action": "Investigate backend pool saturation."
        }
        
    return {
        "prediction": "Stable: No bottlenecks predicted in the next 24 hours.",
        "confidence": 0.92
    }
