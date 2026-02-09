   

import json
import logging
import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

logs_dir = project_root / "logs"
logs_dir.mkdir(exist_ok=True)

captures_dir = project_root / "captures"
captures_dir.mkdir(exist_ok=True)

def print_json(payload):
    print(json.dumps(payload, ensure_ascii=False))

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    from app.core.logging_config import configure_logging

    configure_logging()
    logger = logging.getLogger("vision-capture-service.dev")

    print_json({
        "event": "starting",
        "message": "Starting Vision Capture Service in development mode...",
        "project_root": str(project_root),
        "logs_dir": str(logs_dir),
        "captures_dir": str(captures_dir),
        "host": settings.HOST,
        "port": settings.PORT,
        "docs_url": f"http://{settings.HOST}:{settings.PORT}/docs"
    })

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )
