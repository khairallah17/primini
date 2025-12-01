# Form Validation Implementation with Zod

This document describes the Zod-based form validation implementation for all frontend forms.

## Overview

All forms now use:
- **Zod** for schema validation
- **react-hook-form** for form state management
- **@hookform/resolvers** to integrate Zod with react-hook-form

## Installed Packages

```bash
npm install zod react-hook-form @hookform/resolvers
```

## Validation Schemas

All validation schemas are defined in `lib/validations.ts`:

### 1. Product Schema (`productSchema`)

Validates product creation/editing forms:
- **name**: Required, 3-200 characters
- **description**: Optional, max 5000 characters
- **brand**: Optional, max 120 characters
- **category_id**: Optional, must be positive number if provided
- **image**: Optional, must be valid URL if provided
- **tags**: Optional array, max 20 tags
- **release_date**: Optional, format YYYY-MM-DD
- **source_category**: Optional, max 150 characters

### 2. Login Schema (`loginSchema`)

Validates login forms:
- **email**: Required, valid email format
- **password**: Required, minimum 8 characters

### 3. Register Schema (`registerSchema`)

Validates registration forms:
- **email**: Required, valid email format
- **password1**: Required, minimum 8 characters, must contain uppercase, lowercase, and number
- **password2**: Required, must match password1

### 4. Alert Schema (`alertSchema`)

Validates price alert forms:
- **threshold**: Required, must be positive number

### 5. Magic Tool Schema (`magicToolSchema`)

Validates magic tool URL input:
- **url**: Required, valid URL format

### 6. CSV File Schema (`csvFileSchema`)

Validates CSV file uploads:
- **file**: Required, max 10MB, must be .csv file

## Updated Components

### ProductFormScreen

**Before**: Manual state management with basic HTML5 validation
**After**: react-hook-form with Zod validation

**Features**:
- Real-time field validation
- Error messages displayed below each field
- Red border on invalid fields
- Form submission only when valid

**Example**:
```tsx
const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
});
```

### LoginScreen

**Before**: Basic HTML5 validation
**After**: Zod validation with react-hook-form

**Features**:
- Email format validation
- Password length validation
- Error messages for each field

### RegisterScreen

**Before**: Manual password matching check
**After**: Zod validation with password strength requirements

**Features**:
- Email validation
- Password strength validation (uppercase, lowercase, number)
- Password confirmation matching
- Clear error messages

### ProductDetailScreen (Alert Form)

**Before**: Manual validation
**After**: Zod validation for threshold price

**Features**:
- Positive number validation
- Real-time error feedback

### MagicToolScreen

**Before**: Basic HTML5 URL validation
**After**: Zod URL validation

**Features**:
- Proper URL format validation
- Error messages

## Validation Features

### Real-time Validation

Forms validate on:
- **Blur**: When user leaves a field
- **Change**: As user types (for some fields)
- **Submit**: Before form submission

### Error Display

- Errors appear below the input field
- Invalid fields have red border
- Error messages are user-friendly and in French

### Type Safety

All form data types are inferred from Zod schemas:
```typescript
type ProductFormData = z.infer<typeof productSchema>;
```

## Usage Example

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../../lib/validations';

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
});

const onSubmit = async (data: ProductFormData) => {
  // data is type-safe and validated
  await createProduct(data);
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('name')} />
    {errors.name && <p>{errors.name.message}</p>}
    <button type="submit" disabled={isSubmitting}>
      Submit
    </button>
  </form>
);
```

## Benefits

1. **Type Safety**: TypeScript types inferred from schemas
2. **Consistency**: Same validation rules across all forms
3. **User Experience**: Clear error messages in French
4. **Developer Experience**: Centralized validation logic
5. **Maintainability**: Easy to update validation rules
6. **Performance**: Efficient validation with react-hook-form

## Validation Rules Summary

| Field | Rules |
|-------|-------|
| Product Name | Required, 3-200 chars |
| Email | Required, valid format |
| Password | Required, min 8 chars, uppercase + lowercase + number |
| URL | Required, valid URL format |
| Price | Required, positive number |
| Date | Optional, YYYY-MM-DD format |
| Tags | Optional, max 20 tags |
| CSV File | Required, max 10MB, .csv extension |

## Future Enhancements

Potential improvements:
- Custom validation messages per field
- Async validation (e.g., check if product name exists)
- Field-level validation rules
- Conditional validation based on other fields
- Internationalization of error messages

