#!/bin/bash

echo "🚀 Starting Task Management Production Environment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is required!"
    exit 1
fi

# Wait for database to be available
echo "⏳ Waiting for database connection..."
until pg_isready -d "$DATABASE_URL" 2>/dev/null; do
    echo "⏳ Database not ready, waiting 2 seconds..."
    sleep 2
done

echo "✅ Database connection established!"

# Run database migrations
echo "🔧 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (in case of any schema changes)
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run database seeding (only if tables are empty)
echo "🌱 Seeding database with initial data..."
npx prisma db seed --skip-seed 2>/dev/null || echo "⚠️  Database seeding skipped (data already exists)"

# Create uploads directory if it doesn't exist
mkdir -p uploads

echo "🚀 Starting Next.js application..."
exec node server.js