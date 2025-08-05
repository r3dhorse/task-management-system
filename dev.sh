#!/bin/bash

echo "🚀 Starting Task Management Development Environment..."

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Start PostgreSQL and app with Docker Compose
echo "📦 Starting Docker containers..."
docker-compose -f docker-compose.dev.yml up --build

echo "✨ Development environment started!"
echo "📖 Access the app at: http://localhost:3001"
echo "🗄️  PostgreSQL available at: localhost:5432"
echo "🎮 To stop: Ctrl+C or 'docker-compose -f docker-compose.dev.yml down'"