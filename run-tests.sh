#!/bin/bash

# VulnManager Tier 1 Test Runner
# Runs all frontend and backend tests with coverage reporting

set -e  # Exit on error

echo "🧪 VulnManager Tier 1 Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Check if running in Docker or local
if [ -f /.dockerenv ]; then
    ENVIRONMENT="docker"
    print_status "Running tests in Docker environment" "$YELLOW"
else
    ENVIRONMENT="local"
    print_status "Running tests in local environment" "$YELLOW"
fi

echo ""

# Backend Tests
print_status "📦 Running Backend Tests..." "$YELLOW"
echo "-----------------------------------"

cd backend

if [ "$ENVIRONMENT" = "docker" ]; then
    docker exec vuln-manager-backend-1 pytest --cov=app --cov-report=term --cov-report=html -v
else
    # Check if pytest is installed
    if ! python -m pytest --version &> /dev/null; then
        print_status "Installing test dependencies..." "$YELLOW"
        pip install pytest pytest-cov
    fi
    
    python -m pytest --cov=app --cov-report=term --cov-report=html -v
fi

BACKEND_EXIT_CODE=$?

if [ $BACKEND_EXIT_CODE -eq 0 ]; then
    print_status "✅ Backend tests passed!" "$GREEN"
else
    print_status "❌ Backend tests failed!" "$RED"
fi

echo ""

# Frontend Tests
print_status "🎨 Running Frontend Tests..." "$YELLOW"
echo "-----------------------------------"

cd ../frontend

if [ "$ENVIRONMENT" = "docker" ]; then
    docker exec vuln-manager-frontend-1 npm run test:run
else
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..." "$YELLOW"
        npm install
    fi
    
    npm run test:run
fi

FRONTEND_EXIT_CODE=$?

if [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    print_status "✅ Frontend tests passed!" "$GREEN"
else
    print_status "❌ Frontend tests failed!" "$RED"
fi

echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="

if [ $BACKEND_EXIT_CODE -eq 0 ] && [ $FRONTEND_EXIT_CODE -eq 0 ]; then
    print_status "✅ All tests passed!" "$GREEN"
    print_status "" "$NC"
    print_status "Coverage reports generated:" "$YELLOW"
    echo "  - Backend: backend/htmlcov/index.html"
    echo "  - Frontend: frontend/coverage/index.html"
    exit 0
else
    print_status "❌ Some tests failed!" "$RED"
    [ $BACKEND_EXIT_CODE -ne 0 ] && echo "  - Backend tests failed"
    [ $FRONTEND_EXIT_CODE -ne 0 ] && echo "  - Frontend tests failed"
    exit 1
fi
