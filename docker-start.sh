#!/bin/bash

echo "🚀 Starting Task Management Production Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your production values before continuing!"
    exit 1
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Start PostgreSQL and app with Docker Compose
echo "📦 Starting Docker containers..."
docker-compose up -d

echo "✨ Production environment started!"
echo "📖 Access the app at: http://localhost:3000"
echo "🗄️  PostgreSQL available at: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop containers: docker-compose down"
echo "  - Stop and remove data: docker-compose down -v"
echo "  - Rebuild and start: docker-compose up --build -d"