# Use an official Python base image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

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
COPY ./app /app

# Install debugging tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV ENVIRONMENT=production
ENV WORKERS=2
ENV WORKER_CLASS=uvicorn.workers.UvicornWorker

# Run the application with production settings and fewer workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-access-log", "--limit-concurrency", "1000", "--backlog", "2048", "--timeout-keep-alive", "5"]