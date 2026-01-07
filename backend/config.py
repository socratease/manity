"""
Backend configuration module for Manity Portfolio API.

This module uses pydantic-settings to load configuration from environment variables
and .env files, providing type-safe access to all application settings.
"""

import os
from pathlib import Path
from typing import Optional

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and .env file.

    All settings can be overridden by setting the corresponding environment variable.
    Boolean values accept: true/false, yes/no, 1/0, on/off (case-insensitive).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ========================================================================
    # Database Configuration
    # ========================================================================

    database_url: str = Field(
        default="sqlite:///./portfolio.db",
        description="Database connection URL. Supports SQLite and PostgreSQL.",
    )

    default_dev_db_path: str = Field(
        default="/home/c17420g/projects/manity-dev-data/portfolio.db",
        description="Default SQLite database path for development environment",
    )

    default_prod_db_path: str = Field(
        default="/home/c17420g/projects/manity-data/portfolio.db",
        description="Default SQLite database path for production environment",
    )

    # ========================================================================
    # OpenAI / LLM Configuration
    # ========================================================================

    llm_provider: str = Field(
        default="openai",
        description="LLM provider to use: 'openai' or 'azure'",
    )

    llm_model: str = Field(
        default="gpt-5.1",
        description="Model name to use for LLM operations",
    )

    openai_api_key: Optional[str] = Field(
        default=None,
        description="OpenAI API key for standard OpenAI API access",
    )

    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        description="Base URL for OpenAI API (useful for proxies or compatible APIs)",
    )

    # ========================================================================
    # Azure OpenAI Configuration
    # ========================================================================

    azure_openai_endpoint: Optional[str] = Field(
        default=None,
        description="Azure OpenAI endpoint URL",
    )

    azure_openai_api_key: Optional[str] = Field(
        default=None,
        description="Azure OpenAI API key",
    )

    azure_openai_deployment: Optional[str] = Field(
        default=None,
        description="Azure OpenAI deployment name",
    )

    azure_openai_api_version: str = Field(
        default="2024-02-15-preview",
        description="Azure OpenAI API version",
    )

    # ========================================================================
    # Admin & Authentication
    # ========================================================================

    manity_admin_token: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("manity_admin_token", "MANITY_ADMIN_TOKEN", "ADMIN_KEY"),
        description="Admin authentication token for protected endpoints",
    )

    # ========================================================================
    # Environment & Features
    # ========================================================================

    manity_env: str = Field(
        default="development",
        validation_alias=AliasChoices("manity_env", "MANITY_ENV", "ENVIRONMENT"),
        description="Application environment: development, production, test, etc.",
    )

    manity_enable_demo_seed: bool = Field(
        default=False,
        description="Enable demo data seeding on startup",
    )

    # ========================================================================
    # CORS Configuration
    # ========================================================================

    frontend_origins: Optional[str] = Field(
        default=None,
        description="Comma-separated list of allowed frontend origins for CORS",
    )

    frontend_origin_regex: Optional[str] = Field(
        default=None,
        description="Regex pattern for allowed frontend origins (alternative to explicit list)",
    )

    # ========================================================================
    # Validators
    # ========================================================================

    @field_validator("openai_base_url", "azure_openai_endpoint")
    @classmethod
    def strip_trailing_slash(cls, v: Optional[str]) -> Optional[str]:
        """Remove trailing slashes from URLs."""
        if v:
            return v.rstrip("/")
        return v

    @field_validator("manity_env")
    @classmethod
    def normalize_environment(cls, v: str) -> str:
        """Normalize environment name to lowercase."""
        return v.lower().strip()

    @field_validator("manity_enable_demo_seed", mode="before")
    @classmethod
    def parse_boolean(cls, v) -> bool:
        """
        Parse boolean values from strings.
        Accepts: true/false, yes/no, 1/0, on/off (case-insensitive).
        """
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            v_lower = v.lower().strip()
            if v_lower in ("true", "yes", "1", "on"):
                return True
            if v_lower in ("false", "no", "0", "off", ""):
                return False
        return bool(v)

    # ========================================================================
    # Helper Properties
    # ========================================================================

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.manity_env in {"prod", "production"}

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.manity_env in {"dev", "development"}

    @property
    def is_testing(self) -> bool:
        """Check if running in test environment."""
        return self.manity_env in {"test", "testing"}

    @property
    def is_protected_environment(self) -> bool:
        """Check if running in a protected environment (prod, test)."""
        return self.manity_env in {"prod", "production", "test", "testing"}

    @property
    def default_db_path(self) -> str:
        """Get the appropriate default database path based on environment."""
        if self.is_production:
            return self.default_prod_db_path
        return self.default_dev_db_path

    def get_frontend_origins_list(self) -> list[str]:
        """Parse and return the frontend origins as a list."""
        if not self.frontend_origins:
            return []
        return [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]

    def get_effective_database_url(self) -> str:
        """
        Get the effective database URL, using environment variable or default.

        If DATABASE_URL is not explicitly set, returns a SQLite URL using
        the appropriate default path for the current environment.
        """
        # Check if DATABASE_URL was explicitly set in environment
        if "DATABASE_URL" in os.environ:
            return self.database_url

        # Otherwise, use the environment-appropriate default
        return f"sqlite:///{self.default_db_path}"


# ========================================================================
# Global Settings Instance
# ========================================================================

# Create a singleton instance that can be imported throughout the application
settings = Settings()


# ========================================================================
# Legacy Compatibility
# ========================================================================

# For backwards compatibility with existing code that uses these constants
ADMIN_TOKEN_ENV = "MANITY_ADMIN_TOKEN"
ENVIRONMENT_ENV = "MANITY_ENV"
DEV_DEMO_SEED_ENV = "MANITY_ENABLE_DEMO_SEED"
FRONTEND_ORIGINS_ENV = "FRONTEND_ORIGINS"
FRONTEND_ORIGIN_REGEX_ENV = "FRONTEND_ORIGIN_REGEX"
PROTECTED_ENVIRONMENTS = {"prod", "production", "test", "testing"}
DEFAULT_DEV_DB_PATH = settings.default_dev_db_path
DEFAULT_PROD_DB_PATH = settings.default_prod_db_path
DEFAULT_DB_PATH = settings.default_db_path
