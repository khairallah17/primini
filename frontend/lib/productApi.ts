import api from './apiClient';
import type { Product, PaginatedResponse, PriceOffer } from './types';

export type PriceOfferCreateData = {
  merchant_id?: number;
  merchant_name?: string;
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
  const response = await api.get<{ results: Array<{ id: number; name: string; logo?: string; website?: string }> } | Array<{ id: number; name: string; logo?: string; website?: string }>>(
    '/merchants/',
    { params: { page_size: '1000' } } // Fetch all merchants in one go
  );
  return Array.isArray(response.data) ? response.data : response.data.results || [];
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

// Submit a new price offer
export type OfferSubmitData = {
  product_slug: string;
  merchant_id?: number;
  merchant_name?: string;
  price: number;
  url?: string;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  currency?: string;
};

export async function submitOffer(
  data: OfferSubmitData,
  token: string | null
): Promise<PriceOffer> {
  const response = await api.post<PriceOffer>('/offers/submit/', data, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });
  return response.data;
}

// Get pending offers (admin only)
export async function getPendingOffers(
  token: string | null,
  page: number = 1
): Promise<PaginatedResponse<PriceOffer>> {
  const response = await api.get<PaginatedResponse<PriceOffer>>('/offers/pending/', {
    headers: {
      Authorization: `Token ${token}`,
    },
    params: { page },
  });
  return response.data;
}

// Approve offer (admin only)
export async function approveOffer(
  offerId: number,
  token: string | null
): Promise<PriceOffer> {
  const response = await api.post<PriceOffer>(
    `/offers/${offerId}/approve/`,
    {},
    {
      headers: {
        Authorization: `Token ${token}`,
      },
    }
  );
  return response.data;
}

// Reject offer (admin only)
export async function rejectOffer(
  offerId: number,
  rejectionReason: string,
  token: string | null
): Promise<PriceOffer> {
  const response = await api.post<PriceOffer>(
    `/offers/${offerId}/reject/`,
    { rejection_reason: rejectionReason },
    {
      headers: {
        Authorization: `Token ${token}`,
      },
    }
  );
  return response.data;
}

