import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from .config import settings


class JsonFormatter(logging.Formatter):
    standard_attrs = {
        'name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename', 'module',
        'exc_info', 'exc_text', 'stack_info', 'lineno', 'funcName', 'created', 'msecs',
        'relativeCreated', 'thread', 'threadName', 'processName', 'process', 'message', 'asctime'
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat(timespec='milliseconds') + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        extras = {
            key: value for key, value in record.__dict__.items()
            if key not in self.standard_attrs
        }
        if extras:
            payload['extra'] = extras

        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def configure_logging(force_level: str | None = None) -> None:
    root_logger = logging.getLogger()

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_FORMAT.lower() == 'pretty':
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    else:
        formatter = JsonFormatter()
    stream_handler.setFormatter(formatter)
    root_logger.addHandler(stream_handler)

    if settings.LOG_FILE:
        log_file_path = Path(settings.LOG_FILE)
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    level_value = force_level or settings.LOG_LEVEL
    level = getattr(logging, level_value.upper(), logging.INFO)
    root_logger.setLevel(level)

    for logger_name in ('uvicorn', 'uvicorn.error', 'uvicorn.access'):
        uvicorn_logger = logging.getLogger(logger_name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True

