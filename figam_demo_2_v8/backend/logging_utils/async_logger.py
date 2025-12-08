import logging
import logging.handlers
import queue
import pytz
from datetime import datetime
from .config import get_log_level, get_log_file, get_backup_count, enable_console_logging

log_queue = queue.Queue()

class ESTFormatter(logging.Formatter):
    def converter(self, timestamp):
        dt = datetime.fromtimestamp(timestamp, pytz.timezone("US/Eastern"))
        return dt

    def formatTime(self, record, datefmt=None):
        dt = self.converter(record.created)
        return dt.strftime(datefmt) if datefmt else dt.isoformat()

def setup_async_logging(app_logger_name="workforceagent"):
    formatter = ESTFormatter(
        fmt="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler = logging.handlers.TimedRotatingFileHandler(
        get_log_file(), when="midnight", backupCount=get_backup_count()
    )
    file_handler.setFormatter(formatter)

    handlers = [file_handler]

    if enable_console_logging():
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        handlers.append(console_handler)

    queue_handler = logging.handlers.QueueHandler(log_queue)
    listener = logging.handlers.QueueListener(log_queue, *handlers)
    listener.start()

    root_logger = logging.getLogger()
    root_logger.setLevel(get_log_level())
    root_logger.addHandler(queue_handler)

    for name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        uv_logger = logging.getLogger(name)
        uv_logger.handlers.clear()
        uv_logger.setLevel(get_log_level())
        uv_logger.addHandler(queue_handler)
        uv_logger.propagate = False

    watch_logger = logging.getLogger("watchfiles")
    watch_logger.handlers.clear()
    watch_logger.setLevel(logging.WARNING)  # or logging.ERROR to suppress even more
    watch_logger.addHandler(queue_handler)
    watch_logger.propagate = False


    app_logger = logging.getLogger(app_logger_name)
    app_logger.handlers.clear()
    app_logger.setLevel(get_log_level())
    app_logger.addHandler(queue_handler)
    app_logger.propagate = False

    return app_logger
