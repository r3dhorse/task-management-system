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

# Check for --build or --fresh flag
BUILD_FLAG=""
if [ "$1" = "--build" ] || [ "$1" = "--fresh" ]; then
    echo "🔨 Forcing rebuild of containers..."
    BUILD_FLAG="--build"
    if [ "$1" = "--fresh" ]; then
        echo "🧹 Removing old volumes for fresh start..."
        docker-compose -f docker-compose.dev.yml down -v
    fi
fi

# Start development environment
echo "🐳 Starting Docker development containers..."
docker-compose -f docker-compose.dev.yml up $BUILD_FLAG

echo "✅ Full Docker Development environment started!"
echo "📱 Application: http://localhost:3000 (running in Docker)"
echo "🗃️  Database: localhost:5432 (running in Docker)"
echo "🔥 Hot Reload: Enabled with volume mounting - changes will auto-update!"
echo ""
echo "🎯 Both app and database are running in Docker containers"
echo "📝 Make code changes and they will automatically reload"
echo "📝 Test the setup with: ./test-full-docker.sh"