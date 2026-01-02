from backend.routers.people import router as people_router
from backend.routers.projects import router as projects_router
from backend.routers.tasks import router as tasks_router
from backend.routers.activities import router as activities_router
from backend.routers.email import router as email_router

__all__ = [
    'people_router',
    'projects_router',
    'tasks_router',
    'activities_router',
    'email_router',
]
