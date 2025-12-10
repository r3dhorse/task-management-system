#!/bin/bash

echo "🚀 Starting Task Management Development Environment..."

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

# Run database migrations (development)
echo "🔧 Running database migrations..."
npx prisma migrate deploy || {
    echo "⚠️  migrate deploy failed, trying db push as fallback..."
    npx prisma db push
}

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run database seeding for development
echo "🌱 Seeding database with development data..."
npm run db:seed:dev || echo "⚠️  Database seeding failed or skipped"

# Create uploads directory if it doesn't exist
mkdir -p uploads

echo "🚀 Starting Next.js development server..."
exec npm run dev:docker