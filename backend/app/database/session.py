import re
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def normalize_database_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    # Handle passwords that contain '@' or unencoded characters
    # Standard format: scheme://username:password@host[:port][/database]
    m = re.match(r'^(postgresql(?:\+[a-z0-9]+)?://)([^:]+):(.*)@([^@/:]+)(?::(\d+))?(/.*)?$', url)
    if m:
        scheme, user, raw_pass, host, port, path = m.groups()
        encoded_pass = urllib.parse.quote_plus(raw_pass)
        port_str = f":{port}" if port else ""
        path_str = path or ""
        return f"{scheme}{user}:{encoded_pass}@{host}{port_str}{path_str}"
    
    return url

db_url = normalize_database_url(settings.DATABASE_URL)

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Set a 10s TCP connection timeout to avoid hanging startup
    connect_args = {"connect_timeout": 10}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True if not db_url.startswith("sqlite") else False,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
