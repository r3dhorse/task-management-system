#!/bin/bash

# Database Reset Script
# This script deletes all database tables and tests system recovery

set -e

echo "🔥 Starting database reset..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will DELETE ALL DATABASE TABLES!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 0
fi

echo ""
echo "🗑️  Using Prisma db push to reset and sync database schema..."
npx prisma db push --force-reset --accept-data-loss

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "👤 Creating superadmin user: jun@mail.com"
npm run create-superadmin jun@mail.com Shithappen1s "Jun Admin"

echo ""
echo "✅ Database reset completed successfully!"
echo ""
echo "📊 Database should now contain:"
echo "- All tables recreated from schema"
echo "- SuperAdmin user: jun@mail.com"
echo "- Password: Shithappen1s"
echo ""
echo "🚀 You can now start the development server with: ./dev.sh"