"""
app/core/config.py — centralised settings via pydantic-settings
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    supabase_anon_key: str = ""

    default_org_id: str = ""
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_s3_bucket: str = "brightwayz-uploads"

    google_maps_api_key: str = ""
    anthropic_api_key: str = ""

    resend_api_key: str = ""
    notification_from_email: str = "no-reply@brightwayz.io"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
