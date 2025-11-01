"""
Pytest configuration and fixtures for backend tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.main import get_session


# Create a test engine once for all tests
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@pytest.fixture(name="session", scope="function")
def session_fixture():
    """
    Create a fresh in-memory SQLite database for each test
    """
    # Create all tables
    SQLModel.metadata.create_all(test_engine)
    
    with Session(test_engine) as session:
        yield session
    
    # Clean up - drop all tables after test
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(name="client", scope="function")
def client_fixture(session: Session):
    """
    Create a test client with dependency injection override
    """
    def get_session_override():
        yield session
    
    app.dependency_overrides[get_session] = get_session_override
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()
