import uuid


def new_id(prefix: str) -> str:
    """Collision-safe identifier (the old millisecond timestamps could collide)."""
    return f"{prefix}-{uuid.uuid4().hex[:16]}"
