#!/bin/bash

echo "🚀 Starting Primini.ma Clone - Development Mode"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if backend is ready
echo "🔍 Checking backend..."
if docker-compose exec -T backend python manage.py check > /dev/null 2>&1; then
    echo "✅ Backend is ready"
else
    echo "⚠️  Backend might need a moment to start"
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
docker-compose exec -T backend python manage.py migrate

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📍 Access points:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:8000/api"
echo "   Admin Panel: http://localhost:8000/admin"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart:          docker-compose restart"
echo "   Import data:      docker-compose exec backend python manage.py import_offers /app/../offers"
echo "   Create superuser: docker-compose exec backend python manage.py createsuperuser"
echo ""

