"""Application configuration read from the environment.

Values are read lazily via ``os.environ.get`` with working defaults where one is
legitimate, so importing this module never crashes the process. ``JWT_SECRET`` has
no default: it is a signing secret supplied by ``RUN.json`` (class ``generate``)
at start-up and must never appear as a literal in this repository.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    jwt_secret: str
    database_url: str
    access_token_expire_hours: int
    frontend_origin: str


def _build_settings() -> Settings:
    return Settings(
        jwt_secret=os.environ.get("JWT_SECRET", ""),
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./helpdesk.db"),
        access_token_expire_hours=int(os.environ.get("ACCESS_TOKEN_EXPIRE_HOURS", "24")),
        frontend_origin=os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
    )


settings = _build_settings()
