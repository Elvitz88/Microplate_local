import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict


class JsonFormatter(logging.Formatter):
                                                     

    _standard_attrs = {
        'name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename', 'module',
        'exc_info', 'exc_text', 'stack_info', 'lineno', 'funcName', 'created', 'msecs',
        'relativeCreated', 'thread', 'threadName', 'processName', 'process', 'message', 'asctime'
    }

    def format(self, record: logging.LogRecord) -> str:
        log_record: Dict[str, Any] = {
            'timestamp': datetime.utcnow().isoformat(timespec='milliseconds') + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        extras = {
            key: value for key, value in record.__dict__.items()
            if key not in self._standard_attrs
        }
        if extras:
            log_record['extra'] = extras

        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_record, default=str)


def configure_logging(level: str = 'INFO') -> None:
    root_logger = logging.getLogger()

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root_logger.addHandler(handler)

    resolved_level = getattr(logging, (level or 'INFO').upper(), logging.INFO)
    root_logger.setLevel(resolved_level)

    for logger_name in ('uvicorn', 'uvicorn.error', 'uvicorn.access'):
        uvicorn_logger = logging.getLogger(logger_name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True

