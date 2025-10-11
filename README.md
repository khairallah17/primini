# Primini.ma Clone - Price Comparison Platform

A full-stack price comparison platform for tech products in Morocco, built with Django REST Framework and Next.js.

## 🚀 Features

- **Product Comparison**: Compare prices from 56+ merchants across 11,829+ products
- **Smart Filtering**: Filter by category, brand, price range, and more
- **Price Alerts**: Get notified when product prices drop (authenticated users)
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Image Optimization**: High-quality images with Next.js optimization
- **Modern UI**: Built with Tailwind CSS and beautiful animations

## 📊 Database Stats

- **11,829 Products** across multiple categories
- **14 Categories** (including subcategories)
- **56 Merchants** (verified stores)
- **21,124 Price Offers** (real-time comparisons)

## 🏗️ Tech Stack

### Backend
- **Django 5.2.7** - Python web framework
- **Django REST Framework** - RESTful API
- **PostgreSQL** (Production) / SQLite (Development)
- **django-allauth** - Authentication
- **dj-rest-auth** - REST API authentication
- **django-cors-headers** - CORS handling

### Frontend
- **Next.js 14.2.5** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - API client
- **Headless UI** - Accessible components

## 📁 Project Structure

```
primini/
├── backend/                 # Django backend
│   ├── primini_backend/
│   │   ├── products/       # Products app
│   │   ├── alerts/         # Price alerts app
│   │   ├── pages/          # Static pages app
│   │   ├── users/          # Custom user model
│   │   ├── settings.py     # Django settings
│   │   ├── urls.py         # URL routing
│   │   └── pagination.py   # Custom pagination
│   ├── requirements.txt
│   ├── Dockerfile          # Dev Dockerfile
│   └── Dockerfile.prod     # Production Dockerfile
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js 14 app directory
│   ├── components/        # React components
│   ├── lib/               # Utilities & types
│   ├── context/           # React context
│   ├── Dockerfile         # Dev Dockerfile
│   └── Dockerfile.prod    # Production Dockerfile
├── nginx/                 # Nginx configuration (production)
├── offers/                # JSON data for import
├── docker-compose.yml     # Development setup
└── docker-compose.prod.yml # Production setup
```

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** installed
- Or: **Python 3.12+**, **Node.js 20+**, and **PostgreSQL 16+**

## 🐳 Docker Setup (Recommended)

### Development Mode

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd primini
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Run migrations**
```bash
docker-compose exec backend python manage.py migrate
```

4. **Import product data**
```bash
docker-compose exec backend python manage.py import_offers /app/../offers
```

5. **Create a superuser** (optional)
```bash
docker-compose exec backend python manage.py createsuperuser
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Panel: http://localhost:8000/admin

### Production Mode

1. **Create environment variables**
```bash
# Create .env file with production values
cat > .env << EOF
DJANGO_SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
POSTGRES_PASSWORD=$(openssl rand -base64 32)
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api
EOF
```

2. **Build and start production services**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

3. **Run migrations**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

4. **Import data**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py import_offers /app/../offers
```

5. **Create superuser**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

6. **Access via Nginx**
- Application: http://localhost (or your domain)

## 💻 Local Development (Without Docker)

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create and activate virtual environment**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run migrations**
```bash
python manage.py migrate
```

5. **Import product data**
```bash
python manage.py import_offers ../offers
```

6. **Create superuser** (optional)
```bash
python manage.py createsuperuser
```

7. **Start development server**
```bash
python manage.py runserver
```

The backend API will be available at: http://localhost:8000/api

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

The frontend will be available at: http://localhost:3000

## 📝 Environment Variables

### Backend (.env or docker-compose)

| Variable | Description | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Django secret key | `dev-secret-key` |
| `DJANGO_DEBUG` | Debug mode | `true` |
| `DJANGO_ALLOWED_HOSTS` | Allowed hosts | `*` |
| `DATABASE_URL` | PostgreSQL connection | SQLite (dev) |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
| `NODE_ENV` | Environment | `development` |

## 🔧 Management Commands

### Import Product Data
```bash
# Docker
docker-compose exec backend python manage.py import_offers /path/to/offers

# Local
python manage.py import_offers /path/to/offers
```

### Create Superuser
```bash
# Docker
docker-compose exec backend python manage.py createsuperuser

# Local
python manage.py createsuperuser
```

### Collect Static Files (Production)
```bash
# Docker
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Local
python manage.py collectstatic --noinput
```

## 🛠️ API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products/` | GET | List products with filters |
| `/api/products/{slug}/` | GET | Product details |
| `/api/products/search/` | GET | Search products |
| `/api/categories/` | GET | List categories |
| `/api/categories/{slug}/` | GET | Category details |
| `/api/merchants/` | GET | List merchants |
| `/api/offers/` | GET | List price offers |
| `/api/popular-products/` | GET | Popular products |
| `/api/promotions/` | GET | Active promotions |
| `/api/pages/` | GET | Static pages |
| `/api/faqs/` | GET | FAQ entries |

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login/` | POST | User login |
| `/api/auth/registration/` | POST | User registration |
| `/api/auth/logout/` | POST | User logout |
| `/api/auth/user/` | GET | Current user |
| `/api/auth/password/reset/` | POST | Password reset |

### Protected Endpoints (Require Authentication)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alerts/` | GET, POST | Price alerts |
| `/api/alerts/{id}/` | PATCH, DELETE | Manage alert |

## 📱 API Response Format

### Paginated Responses
```json
{
  "count": 11829,
  "total_pages": 5915,
  "current_page": 1,
  "next_page": 2,
  "previous_page": null,
  "page_size": 12,
  "results": [...]
}
```

### Query Parameters

**Products List:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (max: 100, default: 12)
- `category`: Filter by category slug
- `brand`: Filter by brand name
- `price_min`: Minimum price
- `price_max`: Maximum price
- `ordering`: Sort field (options: `lowest_price`, `-lowest_price`, `name`, `-id`)
- `search`: Search query

## 🎨 Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with categories and popular products |
| `/categories` | All categories |
| `/categories/{slug}` | Products by category |
| `/product/{slug}` | Product detail page |
| `/deals` | Best deals |
| `/search` | Search results |
| `/login` | User login |
| `/register` | User registration |
| `/forgot-password` | Password reset |
| `/magic-tool` | Magic price lookup |
| `/about` | About page |
| `/contact` | Contact page |
| `/faq` | FAQ |
| `/terms` | Terms of service |

## 🧪 Testing

### Backend Tests
```bash
# Docker
docker-compose exec backend python manage.py test

# Local
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm run lint
npm run build  # Test production build
```

## 📦 Production Deployment

### Using Docker Compose

1. **Update environment variables** in `.env` file
2. **Build and start services**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

3. **Run migrations**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

4. **Import data**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py import_offers /app/../offers
```

5. **Create superuser**
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### Production Checklist

- [ ] Set secure `DJANGO_SECRET_KEY`
- [ ] Set `DJANGO_DEBUG=false`
- [ ] Configure `DJANGO_ALLOWED_HOSTS`
- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Configure domain in `NEXT_PUBLIC_API_BASE_URL`
- [ ] Set up SSL certificates (if using HTTPS)
- [ ] Configure backup strategy for database
- [ ] Set up monitoring and logging
- [ ] Configure email backend (for password resets)

## 🔒 Security Notes

### Development
- Uses default secret key (not secure)
- CORS allows localhost
- Debug mode enabled
- SQLite database

### Production
- Generate strong secret key
- Disable debug mode
- Restrict CORS to your domain
- Use PostgreSQL
- Gunicorn WSGI server
- Nginx reverse proxy
- SSL/TLS recommended

## 📊 Performance Optimizations

### Backend
- Custom pagination (page numbers, not URLs)
- Database query optimization (`select_related`, `prefetch_related`)
- Indexed fields (slug, foreign keys)
- Caching headers for static files

### Frontend
- Next.js Image optimization (AVIF, WebP)
- Lazy loading for images
- Code splitting
- SSR/SSG where appropriate
- Optimized bundle sizes

## 🛠️ Development Tools

### Backend Commands
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations  
python manage.py migrate

# Run development server
python manage.py runserver

# Access Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser
```

### Frontend Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## 🐛 Troubleshooting

### CORS Errors
- Ensure backend `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Check `CORS_ALLOW_CREDENTIALS = True` in backend settings

### Image Loading Errors
- Verify image hosts are in `next.config.mjs` `remotePatterns`
- Check network connectivity to external image CDNs

### Database Connection Errors (Docker)
- Wait for database to be ready before starting backend
- Use `depends_on` in docker-compose
- Check PostgreSQL is running: `docker-compose ps`

### Migration Errors
- Delete SQLite database: `rm backend/db.sqlite3`
- Delete migrations: `find . -path "*/migrations/*.py" -not -name "__init__.py" -delete`
- Recreate: `python manage.py makemigrations && python manage.py migrate`

## 📄 License

This project is a clone/demo of Primini.ma for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions

## 🎯 Project Status

- ✅ Backend API fully functional
- ✅ Frontend with all pages
- ✅ Product import system
- ✅ User authentication
- ✅ Price comparison
- ✅ Filtering and search
- ✅ Responsive design
- ✅ Docker support
- ✅ Production ready

---

Built with ❤️ for the Moroccan tech community
