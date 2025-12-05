import os
import logging

def get_log_level():
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    return getattr(__import__("logging"), level, logging.INFO)

def get_log_file():
    return os.getenv("LOG_FILE", "uvicorn.log")

def get_backup_count():
    try:
        return int(os.getenv("LOG_BACKUP_COUNT", "30"))
    except ValueError:
        return 30

def enable_console_logging():
    return os.getenv("ENABLE_CONSOLE_LOG", "true").lower() == "true"
