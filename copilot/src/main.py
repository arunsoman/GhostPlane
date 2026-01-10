from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.agent import agent
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.post("/chat")
async def chat(request: ChatRequest):
    initial_state = {
        "messages": [request.message],
        "reasoning_trail": [],
        "result": None,
        "intent": "",
        "metrics_history": [
            {"latency": 10, "disk_usage": 80},
            {"latency": 25, "disk_usage": 95},
        ]
    }
    result = await agent.ainvoke(initial_state)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
