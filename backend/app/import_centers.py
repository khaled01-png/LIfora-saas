"""Add real, checked blood centers from a JSON file (no web UI needed).

    python -m backend.app.import_centers path/to/centers.json

Each item uses the fields in `CenterIn` (see backend/centers.example.json). Run it against your
production DATABASE_URL. Only add centers whose details you have verified yourself.
"""
import json
import sys

from backend.app.database import Base, engine, SessionLocal
from backend.app.models.center import BloodCenter
from backend.app.routes.centers import CenterIn, apply_center
from backend.app.utils.ids import new_id


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    with open(sys.argv[1], encoding="utf-8") as f:
        items = json.load(f)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for raw in items:
            data = CenterIn(**raw)
            existing = db.query(BloodCenter).filter(BloodCenter.name == data.name.strip()).first()
            center = apply_center(existing or BloodCenter(id=new_id("center")), data)
            if not existing:
                db.add(center)
            print(("Updated " if existing else "Added ") + data.name)
        db.commit()
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
