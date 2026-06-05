# Use an official lightweight Python image
FROM python:3.11-slim

# Set environment variables to prevent Python from writing pyc and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    DEBIAN_FRONTEND=noninteractive

# Install system essentials and Linux packages required for Headless Chrome/Selenium
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    curl \
    unzip \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install sanitized Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright core binaries and their required Linux system libraries
RUN playwright install --with-deps chromium

# Copy the entire project into the container
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Start application using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]