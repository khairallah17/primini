# Primini.ma Clone - Setup Guide

This guide will help you set up the Primini.ma clone project locally or in production.

## 🎯 Quick Start (3 commands)

```bash
# 1. Start development environment
./start-dev.sh

# 2. Import product data
docker-compose exec backend python manage.py import_offers /app/../offers

# 3. Create admin user
docker-compose exec backend python manage.py createsuperuser
```

Then visit http://localhost:3000 🎉

---

## 📋 Table of Contents

1. [Development Setup](#-development-setup)
2. [Production Deployment](#-production-deployment)
3. [Manual Installation](#-manual-installation)
4. [Data Import](#-data-import)
5. [Common Issues](#-common-issues)

---

## 🛠️ Development Setup

### Option 1: Using Docker (Recommended)

**Prerequisites:**
- Docker Desktop installed
- Docker Compose installed

**Steps:**

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd primini

# 2. Start all services
./start-dev.sh

# Or manually:
docker-compose up -d

# 3. Check logs
docker-compose logs -f

# 4. Import data (first time only)
docker-compose exec backend python manage.py import_offers /app/../offers

# 5. Create superuser (optional)
docker-compose exec backend python manage.py createsuperuser
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin
- Database: localhost:5432

### Option 2: Local Development (Without Docker)

**Prerequisites:**
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ (optional, SQLite works for dev)

**Backend Setup:**

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Import data
python manage.py import_offers ../offers

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

**Frontend Setup:**

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🚀 Production Deployment

### Using Docker Compose

**1. Create `.env` file:**

```bash
cat > .env << EOF
# Django
DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api
EOF
```

**2. Deploy:**

```bash
# Run deployment script
./deploy-prod.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

**3. Import data:**

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py import_offers /app/../offers
```

**4. Create admin user:**

```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Manual Production Deployment

See the main README.md for detailed manual deployment instructions.

---

## 📦 Data Import

The project includes a custom management command to import products from JSON files.

### Import All Data

```bash
# Docker
docker-compose exec backend python manage.py import_offers /app/../offers

# Local
cd backend
python manage.py import_offers ../offers
```

### Import Specific Category

```bash
# Only import smartphones
python manage.py import_offers ../offers/telephonie_with_offers
```

### What Gets Imported

- ✅ Categories (auto-created from folder structure)
- ✅ Subcategories (nested folders)
- ✅ Products (from JSON files)
- ✅ Merchants (extracted from offers)
- ✅ Price Offers (all pricing data)

The import is **idempotent** - running it multiple times won't create duplicates.

---

## 🐛 Common Issues

### 1. Port Already in Use

**Error:** `Address already in use`

**Solution:**
```bash
# Find and kill processes on ports 3000/8000
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Or use different ports in docker-compose.yml
```

### 2. Database Connection Error

**Error:** `could not connect to database`

**Solution:**
```bash
# Wait for database to be ready
docker-compose exec backend python manage.py wait_for_db  # If you add this command

# Or restart services
docker-compose restart
```

### 3. CORS Errors in Frontend

**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution:**
- Check `CORS_ALLOWED_ORIGINS` in `backend/primini_backend/settings.py`
- Ensure it includes your frontend URL
- For Docker: Use service names (backend, frontend)

### 4. Image Loading Errors

**Error:** `hostname not configured under images`

**Solution:**
- Add hostname to `frontend/next.config.mjs` `remotePatterns`
- Check image URLs are valid
- Verify network connectivity

### 5. Migration Errors

**Error:** `No migrations to apply` or `Dependency on app with no migrations`

**Solution:**
```bash
# Docker
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Local
python manage.py makemigrations
python manage.py migrate
```

---

## 🔄 Useful Commands

### Docker Development

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v

# Access Django shell
docker-compose exec backend python manage.py shell

# Access backend container
docker-compose exec backend sh

# Rebuild specific service
docker-compose up -d --build backend
```

### Docker Production

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backend Commands

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Import data
python manage.py import_offers /path/to/offers

# Django shell
python manage.py shell

# Run tests
python manage.py test
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

---

## 📊 Database Management

### Backup Database (Production)

```bash
# PostgreSQL backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U primini primini > backup.sql

# Restore
docker-compose -f docker-compose.prod.yml exec -T db psql -U primini primini < backup.sql
```

### SQLite Backup (Development)

```bash
# Backup
cp backend/db.sqlite3 backend/db.sqlite3.backup

# Restore
cp backend/db.sqlite3.backup backend/db.sqlite3
```

---

## 🔐 Security Checklist

### Before Going to Production

- [ ] Change `DJANGO_SECRET_KEY` to a strong random value
- [ ] Set `DJANGO_DEBUG=false`
- [ ] Configure `DJANGO_ALLOWED_HOSTS` with your domain
- [ ] Use strong `POSTGRES_PASSWORD`
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up regular database backups
- [ ] Enable Django security middleware
- [ ] Review and update CORS settings
- [ ] Set up monitoring and logging

---

## 📞 Support

For issues or questions:
1. Check this setup guide
2. Review the main README.md
3. Check Docker logs: `docker-compose logs`
4. Open an issue on GitHub

---

**Happy Coding! 🎉**

