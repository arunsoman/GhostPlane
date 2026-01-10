import httpx
import os

API_BASE_URL = os.getenv("NLB_API_URL", "http://localhost:8081")

async def get_logs() -> list[dict]:
    """
    Get recent audit logs from NLB+.
    
    Returns:
        list[dict]: List of audit log events.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_BASE_URL}/api/logs")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return [{"error": f"Failed to fetch logs: {str(e)}"}]
