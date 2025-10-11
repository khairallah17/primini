# Docker Guide for Primini.ma Clone

Complete guide for running Primini.ma clone with Docker.

## 🐳 Docker Architecture

```
┌─────────────────────────────────────────────────┐
│                    Nginx                        │
│              (Port 80/443)                      │
│         Reverse Proxy & Load Balancer           │
└─────────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐           ┌────────▼───────┐
│   Frontend     │           │    Backend     │
│   Next.js      │           │    Django      │
│   Port 3000    │           │   Port 8000    │
└────────────────┘           └────────┬───────┘
                                      │
                             ┌────────▼────────┐
                             │   PostgreSQL    │
                             │   Port 5432     │
                             └─────────────────┘
```

## 📦 Services

### Development (docker-compose.yml)

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| backend | Custom (Python 3.12) | 8000 | Django API |
| frontend | Custom (Node 20) | 3000 | Next.js App |
| db | postgres:16-alpine | 5432 | PostgreSQL |

### Production (docker-compose.prod.yml)

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| backend | Custom (optimized) | - | Django + Gunicorn |
| frontend | Custom (standalone) | - | Next.js production |
| nginx | nginx:alpine | 80, 443 | Reverse proxy |
| db | postgres:16-alpine | - | PostgreSQL |

## 🚀 Commands Reference

### Development

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Restart a service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Execute command in container
docker-compose exec backend python manage.py shell
docker-compose exec frontend npm run build

# Access container shell
docker-compose exec backend sh
docker-compose exec frontend sh

# Remove everything (⚠️ includes volumes)
docker-compose down -v
```

### Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# Stop production stack
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Execute commands
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Update deployment
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔧 Customization

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3001:3000"  # Host:Container
  backend:
    ports:
      - "8001:8000"  # Host:Container
```

### Add Environment Variables

Edit service in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - CUSTOM_VAR=value
      - ANOTHER_VAR=${ENV_VAR_FROM_HOST}
```

### Mount Additional Volumes

```yaml
services:
  backend:
    volumes:
      - ./backend:/app
      - ./custom-data:/app/data  # Add custom mount
```

## 🐞 Debugging

### Check Service Status

```bash
docker-compose ps
```

### Inspect Container

```bash
# Get container details
docker inspect primini-backend-dev

# Check environment variables
docker-compose exec backend env

# View resource usage
docker stats
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect primini_primini-network

# Test connectivity between services
docker-compose exec frontend ping backend
docker-compose exec backend ping db
```

### Database Connection Test

```bash
# Connect to PostgreSQL from backend
docker-compose exec backend python manage.py dbshell

# Or directly
docker-compose exec db psql -U primini -d primini
```

## 🔄 Development Workflow

### 1. Code Changes

**Backend:**
- Changes to Python files auto-reload (volume mounted)
- No rebuild needed for code changes
- Rebuild needed for dependency changes

**Frontend:**
- Changes auto-reload (HMR)
- No rebuild needed for code changes
- Rebuild for dependency changes

### 2. Adding Dependencies

**Backend:**
```bash
# Add to requirements.txt
echo "new-package>=1.0" >> backend/requirements.txt

# Rebuild container
docker-compose up -d --build backend
```

**Frontend:**
```bash
# Install in container
docker-compose exec frontend npm install new-package

# Or rebuild
docker-compose up -d --build frontend
```

### 3. Database Changes

```bash
# Make migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate

# Reset database (⚠️ destroys data)
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

## 📊 Performance Tips

### Development

- Use volume mounts for hot-reload
- Keep minimal services running
- Use `.dockerignore` to exclude unnecessary files

### Production

- Use multi-stage builds (frontend)
- Don't mount source code volumes
- Use specific image tags (not `latest`)
- Enable Nginx caching
- Set resource limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🎯 Health Checks

Add health checks to `docker-compose.prod.yml`:

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 📝 Best Practices

1. **Use .env files** for configuration
2. **Never commit** secrets or credentials
3. **Tag your images** with versions
4. **Regular backups** of database
5. **Monitor logs** in production
6. **Update base images** regularly
7. **Use specific versions** in production
8. **Test locally** before deploying

---

**Docker makes deployment simple! 🐳**

