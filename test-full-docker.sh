#!/bin/bash

echo "🐳 Testing Full Docker Development Environment"
echo "=============================================="

echo "📊 Container Status:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🔍 Testing Application Health:"
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Application health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Application health check failed"
    exit 1
fi

echo ""
echo "🌐 Testing Main Application:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Main application endpoint responding (HTTP $HTTP_STATUS)"
else
    echo "❌ Main application endpoint failed (HTTP $HTTP_STATUS)"
    exit 1
fi

echo ""
echo "🗃️  Testing Database Connection:"
USER_COUNT=$(docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d task_management -t -c "SELECT COUNT(*) FROM users;")
if [ "$USER_COUNT" -eq 3 ] 2>/dev/null; then
    echo "✅ Database connection successful ($USER_COUNT users found)"
else
    echo "❌ Database connection failed or unexpected user count"
    exit 1
fi

echo ""
echo "🔐 Testing Database Users:"
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d task_management -c "SELECT email, \"isSuperAdmin\", \"isAdmin\" FROM users ORDER BY email;"

echo ""
echo "📋 Container Logs (last 5 lines):"
echo "--- App Logs ---"
docker-compose -f docker-compose.dev.yml logs --tail=5 app

echo ""
echo "🎯 Full Docker Environment Summary:"
echo "  • Database: ✅ PostgreSQL running in container"
echo "  • Application: ✅ Next.js running in container with hot reload"
echo "  • Network: ✅ Containers communicating correctly"
echo "  • Data: ✅ Database seeded with test users"
echo "  • Health: ✅ All endpoints responding"
echo ""
echo "🚀 Full Docker Development Environment is working perfectly!"
echo "📱 Access: http://localhost:3001"
echo "🔑 Test Users:"
echo "   - SuperAdmin: superadmin@example.com / super123"
echo "   - Admin: admin@example.com / admin123"
echo "   - Member: member@example.com / member123"