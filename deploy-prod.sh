#!/bin/bash

echo "🚀 Deploying Primini.ma Clone - Production Mode"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from example..."
    echo ""
    echo "Please set the following environment variables:"
    echo ""
    echo "DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')"
    echo "DJANGO_DEBUG=false"
    echo "DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com"
    echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
    echo "NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api"
    echo ""
    echo "Copy these to a .env file and run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Building and starting production services..."
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

# Collect static files
echo "📁 Collecting static files..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "📍 Access point:"
echo "   Application: http://localhost (or your configured domain)"
echo ""
echo "📝 Next steps:"
echo "   1. Import data:      docker-compose -f docker-compose.prod.yml exec backend python manage.py import_offers /app/../offers"
echo "   2. Create superuser: docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo "   3. Set up SSL/TLS certificates for HTTPS"
echo "   4. Configure domain DNS"
echo ""
echo "📊 Monitor logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""

