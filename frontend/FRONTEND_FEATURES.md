# Frontend Features Implementation

This document describes the frontend implementation of authentication, authorization, and product management features.

## Overview

The frontend now supports:
- Role-based authentication (Admin, Client)
- Product creation and editing
- CSV upload for bulk product import
- Admin dashboard for product approval
- Role-based UI restrictions

## New Pages & Components

### 1. Product Creation/Editing
- **Route**: `/products/create` (create), `/products/[slug]/edit` (edit)
- **Component**: `ProductFormScreen`
- **Access**: Authenticated Admin or Client
- **Features**:
  - Create new products
  - Edit existing products (admin or product creator)
  - Category selection
  - Tag management
  - Image URL input
  - Automatic approval status based on user role

### 2. CSV Upload
- **Route**: `/products/upload`
- **Component**: `CSVUploadScreen`
- **Access**: Authenticated Admin or Client
- **Features**:
  - Upload CSV files with product data
  - Real-time upload progress
  - Detailed success/error reporting
  - Shows approved vs pending counts

### 3. Admin Dashboard
- **Route**: `/admin`
- **Component**: `AdminDashboardScreen`
- **Access**: Admin only
- **Features**:
  - List all pending products
  - Approve products with one click
  - Reject products with reason
  - View product creator information
  - Pagination support

## Updated Components

### Header Component
- Added role-based navigation links
- Shows "Créer produit" and "Importer CSV" for authenticated users
- Shows "Admin" link for admin users
- Displays user email and logout button

### Product Detail Screen
- Shows approval status badges (pending, rejected)
- Shows rejection reason if product is rejected
- Edit button for admins and product creators
- Role-based visibility

## API Integration

### New API Functions (`lib/productApi.ts`)

1. **createProduct**: Create a new product
2. **updateProduct**: Update an existing product
3. **uploadProductsCSV**: Upload products from CSV file
4. **getPendingProducts**: Get all pending products (admin only)
5. **approveProduct**: Approve a product (admin only)
6. **rejectProduct**: Reject a product with reason (admin only)
7. **getCategories**: Get categories for dropdown

## Type Updates

### User Type
Added `role` field:
```typescript
type User = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'client';
};
```

### Product Type
Added approval workflow fields:
```typescript
approval_status?: 'pending' | 'approved' | 'rejected';
created_by_email?: string;
approved_by_email?: string;
approved_at?: string;
rejection_reason?: string;
created_at?: string;
updated_at?: string;
```

## Auth Context Updates

### New Properties
- `isAdmin`: Boolean indicating if user is admin
- `isClient`: Boolean indicating if user is client

### Usage
```typescript
const { user, isAdmin, isClient, tokens } = useAuth();
```

## Role-Based Access Control

### Client Users
- Can create products (status: pending)
- Can edit their own pending products
- Can upload CSV files
- See only approved products + their own pending products

### Admin Users
- Can create products (status: approved automatically)
- Can edit any product
- Can upload CSV files
- Can approve/reject pending products
- See all products regardless of status
- Access admin dashboard

## UI Features

### Product Status Badges
- **Pending**: Yellow badge "En attente"
- **Rejected**: Red badge "Rejeté"
- **Approved**: No badge (default state)

### Form Validation
- Required fields marked with *
- Real-time error messages
- Success notifications
- Loading states during submission

### CSV Upload
- File validation (must be .csv)
- File size display
- Detailed import results
- Error list (first 10 errors shown)

### Admin Dashboard
- Table view of pending products
- Product images and details
- Creator email display
- Inline approve/reject actions
- Rejection reason textarea
- Pagination controls

## Navigation Flow

1. **Create Product**: Header → "Créer produit" → `/products/create`
2. **Upload CSV**: Header → "Importer CSV" → `/products/upload`
3. **Admin Dashboard**: Header → "Admin" → `/admin`
4. **Edit Product**: Product Detail → "Modifier" → `/products/[slug]/edit`

## Error Handling

- Network errors displayed to user
- Validation errors shown inline
- Authentication errors redirect to login
- Permission errors show appropriate messages

## Security

- All protected routes check authentication
- Admin-only routes check role
- API calls include authentication tokens
- Client users can only edit their own pending products

## Future Enhancements

Potential improvements:
- Product image upload (not just URL)
- Bulk approve/reject in admin dashboard
- Product edit history
- Email notifications for approval/rejection
- Advanced product search and filters
- Product duplication feature

