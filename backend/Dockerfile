# Use an official Python base image
# Pinned to specific digest for reproducible builds and security
FROM python:3.14-slim@sha256:4ed33101ee7ec299041cc41dd268dae17031184be94384b1ce7936dc4e5dead3

# Set the working directory inside the container
WORKDIR /code

# Copy the requirements file and install dependencies
COPY requirements.txt .
# Install system packages required to build psycopg2 (PostgreSQL client headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
	gcc \
	libpq-dev \
	&& rm -rf /var/lib/apt/lists/*
# Use --no-cache-dir to keep the image small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of our application code
COPY ./app /code/app

# Copy Alembic migration files
COPY ./alembic.ini /code/alembic.ini
COPY ./alembic /code/alembic

# Copy tests directory
COPY ./tests /code/tests

# Install debugging tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security (principle of least privilege)
RUN groupadd -g 1001 appuser && \
    useradd -r -u 1001 -g appuser appuser && \
    chown -R appuser:appuser /code

# Switch to non-root user
USER appuser

# Set environment variables
ENV ENVIRONMENT=production
ENV WORKERS=2
ENV WORKER_CLASS=uvicorn.workers.UvicornWorker

# Run the application with production settings and fewer workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-access-log", "--limit-concurrency", "1000", "--backlog", "2048", "--timeout-keep-alive", "5"]