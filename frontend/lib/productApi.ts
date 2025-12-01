import api from './apiClient';
import type { Product, PaginatedResponse } from './types';

export type PriceOfferCreateData = {
  merchant_id: number;
  price: number;
  url?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  currency?: string;
};

export type ProductCreateData = {
  name: string;
  description?: string;
  brand?: string;
  category_id?: number;
  image?: string;
  tags?: string[];
  specs?: Record<string, string | number | boolean>;
  release_date?: string;
  source_category?: string;
  offers?: PriceOfferCreateData[];
};

export type ProductUpdateData = Partial<ProductCreateData>;

export type CSVUploadResponse = {
  message: string;
  success: number;
  approved: number;
  pending: number;
  errors: string[];
  total_errors: number;
};

export type ApprovalAction = {
  action: 'approve' | 'reject';
  rejection_reason?: string;
};

// Get auth header helper
function getAuthHeader(token: string | null) {
  if (!token) return {};
  return { Authorization: `Token ${token}` };
}

// Create product
export async function createProduct(
  data: ProductCreateData,
  token: string | null
): Promise<Product> {
  const response = await api.post<Product>('/products/', data, {
    headers: getAuthHeader(token)
  });
  return response.data;
}

// Update product
export async function updateProduct(
  slug: string,
  data: ProductUpdateData,
  token: string | null
): Promise<Product> {
  const response = await api.patch<Product>(`/products/${slug}/`, data, {
    headers: getAuthHeader(token)
  });
  return response.data;
}

// Upload CSV or Excel file
export async function uploadProductsCSV(
  file: File,
  token: string | null
): Promise<CSVUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<CSVUploadResponse>('/products/upload_csv/', formData, {
    headers: {
      ...getAuthHeader(token),
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
}

// Get my products (client only)
export async function getMyProducts(
  token: string | null,
  page: number = 1,
  approvalStatus?: string
): Promise<PaginatedResponse<Product>> {
  const params: Record<string, string> = { page: page.toString() };
  if (approvalStatus) {
    params.approval_status = approvalStatus;
  }
  
  const response = await api.get<PaginatedResponse<Product>>('/products/my_products/', {
    headers: getAuthHeader(token),
    params
  });
  return response.data;
}

// Get pending products (admin only)
export async function getPendingProducts(
  token: string | null,
  page: number = 1
): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>('/products/pending/', {
    headers: getAuthHeader(token),
    params: { page }
  });
  return response.data;
}

// Approve product (admin only)
export async function approveProduct(
  slug: string,
  token: string | null
): Promise<Product> {
  const response = await api.post<Product>(
    `/products/${slug}/approve/`,
    { action: 'approve' },
    {
      headers: getAuthHeader(token)
    }
  );
  return response.data;
}

// Reject product (admin only)
export async function rejectProduct(
  slug: string,
  rejectionReason: string,
  token: string | null
): Promise<Product> {
  const response = await api.post<Product>(
    `/products/${slug}/approve/`,
    { action: 'reject', rejection_reason: rejectionReason },
    {
      headers: getAuthHeader(token)
    }
  );
  return response.data;
}

// Get all products (admin can filter by approval_status)
export async function getAllProducts(
  token: string | null,
  page: number = 1,
  approvalStatus?: string,
  search?: string
): Promise<PaginatedResponse<Product>> {
  const params: Record<string, string> = { page: page.toString() };
  if (approvalStatus) {
    params.approval_status = approvalStatus;
  }
  if (search) {
    params.search = search;
  }
  
  const response = await api.get<PaginatedResponse<Product>>('/products/', {
    headers: getAuthHeader(token),
    params
  });
  return response.data;
}

// Get categories for dropdown
export async function getCategories(): Promise<Array<{ id: number; name: string; slug: string }>> {
  const response = await api.get('/categories/');
  return response.data.results || response.data;
}

// Get merchants for dropdown
export async function getMerchants(): Promise<Array<{ id: number; name: string; logo?: string; website?: string }>> {
  const response = await api.get('/merchants/');
  return response.data.results || response.data;
}

// Get products with descriptions
export async function getProductsWithDescription(
  minLength: number = 50,
  page: number = 1,
  pageSize: number = 100
): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>('/products/with_description/', {
    params: {
      min_length: minLength,
      page,
      page_size: pageSize
    }
  });
  return response.data;
}

