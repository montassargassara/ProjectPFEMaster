from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Maison3D AI Service"
    app_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8000

    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "immobilierdttb"
    db_user: str = "root"
    db_password: str = ""

    models_dir: Path = Path(__file__).parent.parent / "ml" / "models"
    min_training_samples: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
