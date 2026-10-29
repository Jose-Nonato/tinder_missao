from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "tinder_missao"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    # Validade do link de redefinição de senha gerado pelo admin
    reset_token_minutes: int = 60
    upload_dir: str = "uploads"
    max_upload_mb: int = 2
    # Menor lado aceito (px) nas fotos de perfil
    min_photo_px: int = 400
    # Supabase Storage (opcional): com URL e service key definidos, os uploads vão para o bucket
    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_bucket: str = "photos"
    # Limpeza automática de imagens órfãs: intervalo (0 desliga) e idade mínima para apagar
    image_cleanup_interval_hours: float = 6
    image_cleanup_min_age_hours: float = 24
    # Origens permitidas por CORS, separadas por vírgula (ex.: https://meuapp.vercel.app)
    cors_origins: str | None = None
    # Admin inicial, criado no startup se os três estiverem definidos
    admin_username: str | None = None
    admin_email: str | None = None
    admin_password: str | None = None


settings = Settings()
