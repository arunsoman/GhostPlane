"""Natural Language to Config generator."""

async def generate_config(prompt: str) -> str:
    """Generate NLB+ YAML config from a natural language prompt."""
    # TODO: Call LLM with RAG on config schema
    return "listeners:\n  - port: 80\n    routes: ..."
