import httpx
import os

API_BASE_URL = os.getenv("NLB_API_URL", "http://localhost:8081")

async def get_service_metrics(service_name: str = "nlb") -> dict:
    """
    Get real-time metrics for NLB+ services.
    
    Args:
        service_name: Name of the service to query (default: 'nlb')
        
    Returns:
        dict: Metrics containing latency, RPS, and backend status.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_BASE_URL}/api/metrics")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"error": f"Failed to fetch metrics: {str(e)}"}
