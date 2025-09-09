#!/bin/bash

# Full Docker Development startup script for Task Management System
echo "🚀 Starting Task Management Full Docker Development Environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start development environment with full Docker setup
echo "🐳 Starting full Docker development containers..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Full Docker Development environment started!"
echo "📱 Application: http://localhost:3001 (running in Docker)"
echo "🗃️  Database: localhost:5432 (running in Docker)"
echo "🔥 Hot Reload: Enabled with volume mounting"
echo ""
echo "🎯 Both app and database are running in Docker containers"
echo "📝 Test the setup with: ./test-full-docker.sh"