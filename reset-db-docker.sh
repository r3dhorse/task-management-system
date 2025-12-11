#!/bin/bash

# Docker Database Reset Script
# This script resets the database when using Docker development environment

set -e

echo "🔥 Starting Docker database reset..."

echo ""
echo "⚠️  WARNING: This will DELETE ALL DATABASE DATA!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "🛑 Stopping containers..."
docker-compose -f docker-compose.dev.yml down

echo ""
echo "🗑️  Removing database volume..."
docker volume rm task-management-system_postgres_dev_data 2>/dev/null || true

echo ""
echo "🚀 Starting containers..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

echo ""
echo "🔧 Pushing schema to database..."
docker exec task-management-app-dev npx prisma db push --accept-data-loss

echo ""
echo "🔧 Generating Prisma client..."
docker exec task-management-app-dev npx prisma generate

echo ""
echo "👤 Creating superadmin user: jun@mail.com"
docker exec task-management-app-dev npm run create-superadmin jun@mail.com Shithappen1s "Jun Admin"

echo ""
echo "🌱 Seeding database with default users..."
docker exec task-management-app-dev npm run db:seed

echo ""
echo "✅ Docker database reset completed!"
echo ""
echo "📊 Database now contains:"
echo "- All tables recreated from schema"
echo ""
echo "👤 SuperAdmin:"
echo "   - jun@mail.com / Shithappen1s"
echo ""
echo "👤 Admin:"
echo "   - admin@example.com / admin123"
echo ""
echo "👥 Regular Users (all use password: user123):"
echo "   - Security Officers: security1@mail.com, security2@mail.com, security3@mail.com"
echo "   - Safety Officers: safety1@mail.com, safety2@mail.com, safety3@mail.com"
echo "   - Investigators: investigator1@mail.com, investigator2@mail.com, investigator3@mail.com"
echo "   - CCTV Operators: cctv1@mail.com, cctv2@mail.com, cctv3@mail.com"
echo ""
echo "🔄 Restarting app container to pick up changes..."
docker restart task-management-app-dev

echo ""
echo "✅ Done! App is running at http://localhost:3001"
