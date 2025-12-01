# Authentication & Authorization Guide

This document describes the role-based authentication and authorization system implemented for the Primini backend.

## Overview

The system now supports two user roles:
- **Admin**: Can create products, upload CSV files, and approve/reject client products
- **Client**: Can create products and upload CSV files, but products require admin approval

## User Roles

### Role Assignment

Users are assigned roles during registration or by admins:
- Default role: `client`
- Admin role: `admin` (can be set by superusers in Django admin)

### Role Properties

The `User` model includes helper properties:
- `user.is_admin`: Returns `True` if user is admin or superuser
- `user.is_client`: Returns `True` if user has client role

## Product Approval Workflow

### Status Values

Products can have three approval statuses:
- `pending`: Awaiting admin approval (default for client-created products)
- `approved`: Approved and visible to all users (default for admin-created products)
- `rejected`: Rejected by admin (with optional rejection reason)

### Workflow

1. **Client creates product** → Status: `pending`
2. **Admin reviews product** → Can approve or reject
3. **Product approved** → Status: `approved`, visible to all users
4. **Product rejected** → Status: `rejected`, with rejection reason

### Product Visibility

- **Public users**: Only see `approved` products
- **Clients**: See `approved` products + their own `pending` products
- **Admins**: See all products regardless of status

## API Endpoints

### Product Management

#### Create Product
```http
POST /api/products/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "brand": "Brand Name",
  "category_id": 1,
  "image": "https://example.com/image.jpg",
  "tags": ["tag1", "tag2"]
}
```

**Response:**
- Admin: Product created with `approved` status
- Client: Product created with `pending` status

#### Update Product
```http
PATCH /api/products/{slug}/
Authorization: Token YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Note:** If a client updates an approved product, it resets to `pending` status.

#### Upload Products from CSV
```http
POST /api/products/upload_csv/
Authorization: Token YOUR_TOKEN
Content-Type: multipart/form-data

file: products.csv
```

**CSV Format:**
```csv
name,description,brand,category,image,price,merchant,url,tags
iPhone 15 Pro,Le dernier iPhone,Apple,Smartphones,https://example.com/iphone.jpg,12999.00,Electroplanet,https://electroplanet.ma/iphone,smartphone,apple
```

See `product_upload_template.csv` for a complete example.

**Response:**
```json
{
  "message": "Import terminé: 10 produits créés",
  "success": 10,
  "approved": 8,
  "pending": 2,
  "errors": [],
  "total_errors": 0
}
```

### Admin-Only Endpoints

#### List Pending Products
```http
GET /api/products/pending/
Authorization: Token ADMIN_TOKEN
```

Returns all products with `pending` status.

#### Approve Product
```http
POST /api/products/{slug}/approve/
Authorization: Token ADMIN_TOKEN
Content-Type: application/json

{
  "action": "approve"
}
```

#### Reject Product
```http
POST /api/products/{slug}/approve/
Authorization: Token ADMIN_TOKEN
Content-Type: application/json

{
  "action": "reject",
  "rejection_reason": "Product does not meet quality standards"
}
```

### Filtering Products

#### Filter by Approval Status (Admin only)
```http
GET /api/products/?approval_status=pending
Authorization: Token ADMIN_TOKEN
```

## Permissions

### Permission Classes

The system uses custom permission classes:

1. **IsAdminOrReadOnly**: Allows read access to all, write access to admins only
2. **IsAdminOrClient**: Allows access to authenticated admins and clients
3. **IsAdmin**: Allows access to admins only
4. **CanApproveProduct**: Allows only admins to approve/reject products

### Default Behavior

- **Public endpoints**: Read-only access (no authentication required)
- **Create/Update endpoints**: Require authentication (admin or client)
- **Approval endpoints**: Require admin authentication

## Database Changes

### User Model

Added field:
- `role`: CharField with choices `('client', 'admin')`, default: `'client'`

### Product Model

Added fields:
- `approval_status`: CharField with choices `('pending', 'approved', 'rejected')`, default: `'approved'`
- `created_by`: ForeignKey to User (nullable)
- `approved_by`: ForeignKey to User (nullable)
- `approved_at`: DateTimeField (nullable)
- `rejection_reason`: TextField (optional)

## Migration Instructions

1. **Apply migrations:**
```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

2. **Set existing users' roles:**
```bash
python manage.py shell
```

```python
from primini_backend.users.models import User

# Set superusers as admins
User.objects.filter(is_superuser=True).update(role='admin')

# Set existing users as clients (if not already set)
User.objects.filter(role='').update(role='client')
```

3. **Set existing products to approved:**
```python
from primini_backend.products.models import Product

# Set all existing products to approved
Product.objects.filter(approval_status='').update(approval_status='approved')
```

## Django Admin

### User Admin

- Added `role` field to user creation/edit forms
- Added `role` to list display and filters
- Admins can set user roles when creating/editing users

### Product Admin

- Added approval workflow fields to product admin
- Added `approval_status` to list display and filters
- Shows `created_by` and `approved_by` in list view
- Organized fields into logical fieldsets

## Testing

### Create Admin User
```bash
python manage.py createsuperuser
# Then set role to 'admin' in Django admin
```

### Create Client User
```bash
# Via API registration
POST /api/auth/registration/
{
  "email": "client@example.com",
  "password1": "securepassword123",
  "password2": "securepassword123"
}
```

### Test Product Creation

1. **As Client:**
```bash
curl -X POST http://localhost:8000/api/products/ \
  -H "Authorization: Token CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "brand": "Test Brand"
  }'
```

2. **As Admin:**
```bash
curl -X POST http://localhost:8000/api/products/ \
  -H "Authorization: Token ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Product",
    "description": "Admin description",
    "brand": "Admin Brand"
  }'
```

### Test Approval Workflow

1. **List pending products (Admin):**
```bash
curl http://localhost:8000/api/products/pending/ \
  -H "Authorization: Token ADMIN_TOKEN"
```

2. **Approve product (Admin):**
```bash
curl -X POST http://localhost:8000/api/products/test-product/approve/ \
  -H "Authorization: Token ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

## Security Considerations

1. **Role Assignment**: Only superusers can change user roles via Django admin
2. **Approval Workflow**: Clients cannot approve their own products
3. **Product Visibility**: Pending products are only visible to their creators and admins
4. **CSV Upload**: Requires authentication (admin or client)
5. **Token Authentication**: All protected endpoints require valid authentication tokens

## Troubleshooting

### Products Not Visible

- Check `approval_status` field
- Ensure user has appropriate role/permissions
- Check if product was created by the current user (for clients)

### Cannot Approve Products

- Verify user has `admin` role or is superuser
- Check authentication token is valid
- Ensure endpoint is `/api/products/{slug}/approve/`

### CSV Upload Fails

- Verify file is valid CSV format
- Check authentication token
- Review error messages in response
- Ensure required fields (name) are present

## Future Enhancements

Potential improvements:
- Email notifications for approval/rejection
- Bulk approval/rejection
- Product edit history
- Approval workflow with multiple admin levels
- Product versioning

