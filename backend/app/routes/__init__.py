from backend.app.routes.auth import router as auth_router
from backend.app.routes.donors import router as donors_router
from backend.app.routes.requests import router as requests_router
from backend.app.routes.centers import router as centers_router
from backend.app.routes.inventory import router as inventory_router
from backend.app.routes.notifications import router as notifications_router
from backend.app.routes.stats import router as stats_router
from backend.app.routes.contact import router as contact_router
from backend.app.routes.admin import router as admin_router

__all__ = [
    "auth_router",
    "donors_router",
    "requests_router",
    "centers_router",
    "inventory_router",
    "notifications_router",
    "stats_router",
    "contact_router",
    "admin_router",
]
