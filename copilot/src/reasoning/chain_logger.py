"""Chain of Thought logger."""

class ChainLogger:
    def log(self, step: str, thought: str):
        print(f"[THOUGHT] {step}: {thought}")
        # TODO: Persist to audit log
