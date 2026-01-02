"""
Example: How to use the config module in your backend code.

This file demonstrates the recommended patterns for importing and using
the centralized configuration.
"""

# ============================================================================
# Option 1: Import the singleton settings instance (recommended)
# ============================================================================

from config import settings

# Use settings directly
print(f"Database URL: {settings.get_effective_database_url()}")
print(f"LLM Provider: {settings.llm_provider}")
print(f"Environment: {settings.manity_env}")

# Access helper properties
if settings.is_production:
    print("Running in production mode!")

# Get parsed CORS origins
origins = settings.get_frontend_origins_list()
print(f"Allowed origins: {origins}")


# ============================================================================
# Option 2: Import specific constants for backwards compatibility
# ============================================================================

from config import (
    ADMIN_TOKEN_ENV,
    DEFAULT_DB_PATH,
    PROTECTED_ENVIRONMENTS,
)

print(f"Admin token env var name: {ADMIN_TOKEN_ENV}")
print(f"Default DB path: {DEFAULT_DB_PATH}")


# ============================================================================
# Option 3: Create a new Settings instance (useful for testing)
# ============================================================================

from config import Settings

# This is useful in tests where you want to override settings
test_settings = Settings(
    database_url="sqlite:///:memory:",
    manity_env="testing",
    openai_api_key="test-key",
)

print(f"Test database: {test_settings.database_url}")


# ============================================================================
# Example: Using settings in FastAPI dependency
# ============================================================================

from fastapi import Depends, HTTPException, Header
from typing import Optional

def verify_admin_token(authorization: Optional[str] = Header(None)):
    """FastAPI dependency to verify admin token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = authorization.replace("Bearer ", "")
    if token != settings.manity_admin_token:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    
    return token


# ============================================================================
# Example: Using settings for database connection
# ============================================================================

from sqlmodel import create_engine

# Old way (hardcoded or manual os.getenv)
# database_url = os.getenv("DATABASE_URL", "sqlite:///./portfolio.db")

# New way (using config)
database_url = settings.get_effective_database_url()
engine = create_engine(database_url)


# ============================================================================
# Example: Using settings for LLM configuration
# ============================================================================

def get_llm_client():
    """Get the appropriate LLM client based on configuration."""
    if settings.llm_provider == "azure":
        if not settings.azure_openai_api_key:
            raise ValueError("Azure OpenAI API key not configured")
        
        # Use Azure OpenAI
        from openai import AzureOpenAI
        return AzureOpenAI(
            api_key=settings.azure_openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
        )
    else:
        # Use standard OpenAI
        from openai import OpenAI
        return OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
