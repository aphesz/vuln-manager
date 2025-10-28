import os
from sqlmodel import create_engine, Session, SQLModel

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # Use a generic in-memory SQLite for testing if environment variable is missing
    # WARNING: Do not use this in production.
    DATABASE_URL = "sqlite:///./test.db"
    print("WARNING: Using fallback SQLite database.")

# Ensure we use the correct connector format for PostgreSQL
engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    """Called on startup to create all tables."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency that yields a database session for each API request."""
    with Session(engine) as session:
        yield session