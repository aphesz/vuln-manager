import os
import logging
import psycopg2
from sqlmodel import create_engine, Session, SQLModel
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # Use a generic in-memory SQLite for testing if environment variable is missing
    # WARNING: Do not use this in production.
    DATABASE_URL = "sqlite:///./test.db"
    print("WARNING: Using fallback SQLite database.")

def get_db_connection_params():
    """Extract connection parameters from DATABASE_URL."""
    if not DATABASE_URL or "sqlite" in DATABASE_URL:
        return None
        
    parsed = urlparse(DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://"))
    return {
        "dbname": parsed.path[1:],
        "user": parsed.username,
        "password": parsed.password,
        "host": parsed.hostname,
        "port": parsed.port or 5432
    }

# Ensure we use the correct connector format for PostgreSQL with proper pooling
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600
)

def create_db_and_tables():
    """Called on startup to create all tables."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Dependency that yields a database session for each API request."""
    with Session(engine) as session:
        yield session

def fix_risk_ratings_direct():
    """
    Fix risk ratings using direct PostgreSQL connection to bypass SQLAlchemy type checking.
    Only runs if it detects values that don't match the expected case.
    """
    params = get_db_connection_params()
    if not params:
        logger.warning("Not using PostgreSQL, skipping direct database fix")
        return
        
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        # First, check what values we have
        cur.execute("SELECT DISTINCT risk_rating FROM finding;")
        current_values = [val[0] for val in cur.fetchall()]
        logger.info(f"Current risk rating values in database: {current_values}")
        
        # First, check if we need to recreate the enum
        cur.execute("SELECT unnest(enum_range(NULL::riskrating))")
        enum_values = [val[0] for val in cur.fetchall()]
        logger.info(f"Current enum values: {enum_values}")
        
        # If we don't have the proper case values in the enum, we need to recreate it
        needed_values = ['Critical', 'High', 'Medium', 'Low', 'Informational']
        if not all(val in enum_values for val in needed_values):
            logger.info("Recreating riskrating enum type...")
            
            # We need to drop the enum type, but first we need to handle the column
            cur.execute("""
                -- First, change the column to text temporarily
                ALTER TABLE finding 
                ALTER COLUMN risk_rating TYPE text 
                USING risk_rating::text;
                
                -- Drop the enum type
                DROP TYPE IF EXISTS riskrating;
                
                -- Recreate the enum type with correct values
                CREATE TYPE riskrating AS ENUM (
                    'Critical', 'High', 'Medium', 'Low', 'Informational'
                );
                
                -- Update all values to proper case while it's still text
                UPDATE finding 
                SET risk_rating = CASE 
                    WHEN risk_rating = 'CRITICAL' THEN 'Critical'
                    WHEN risk_rating = 'HIGH' THEN 'High'
                    WHEN risk_rating = 'MEDIUM' THEN 'Medium'
                    WHEN risk_rating = 'LOW' THEN 'Low'
                    WHEN risk_rating IN ('INFORMATION', 'INFORMATIONAL') THEN 'Informational'
                    ELSE 'Low'
                END;
                
                -- Convert the column back to enum
                ALTER TABLE finding 
                ALTER COLUMN risk_rating TYPE riskrating 
                USING risk_rating::riskrating;
            """)
            
            conn.commit()
            logger.info("Successfully recreated enum and updated values")
            
            # Verify the fix
            cur.execute("SELECT DISTINCT risk_rating FROM finding ORDER BY risk_rating;")
            final_values = [val[0] for val in cur.fetchall()]
            logger.info(f"Final risk rating values in database: {final_values}")
        else:
            logger.info("Enum type already has correct values")
        
    except Exception as e:
        logger.error(f"Error fixing database directly: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
        
    except Exception as e:
        logger.error(f"Error fixing database directly: {e}")
        if 'conn' in locals():
            conn.rollback()
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()