import api from './apiClient';
import type { Category, Product, PaginatedResponse } from './types';

export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  image?: string;
  image_display?: string;
  image_file?: string;
  brand?: string;
  category: Category;
  subcategory?: Category | null;
  lowest_price?: number;
  lowestPrice?: number;
  tags?: string[];
  specs?: Record<string, string | number | boolean>;
  approval_status?: 'pending' | 'approved' | 'rejected';
};

export type CategoryProductsParams = {
  subcategory?: string;
  brand?: string;
  price_min?: number;
  price_max?: number;
  tags?: string[];
  ordering?: 'name' | '-name' | 'brand' | '-brand' | 'lowest_price' | '-lowest_price' | 'created_at' | '-created_at';
  page?: number;
  page_size?: number;
};

/**
 * Get all products for a specific category
 * @param categorySlug - The slug of the category (parent or subcategory)
 * @param params - Optional filtering parameters
 * @returns Paginated response with products
 */
export async function getCategoryProducts(
  categorySlug: string,
  params?: CategoryProductsParams
): Promise<PaginatedResponse<ProductSummary>> {
  const queryParams: Record<string, string> = {};
  
  if (params?.subcategory) {
    queryParams.subcategory = params.subcategory;
  }
  if (params?.brand) {
    queryParams.brand = params.brand;
  }
  if (params?.price_min !== undefined) {
    queryParams.price_min = params.price_min.toString();
  }
  if (params?.price_max !== undefined) {
    queryParams.price_max = params.price_max.toString();
  }
  if (params?.tags && params.tags.length > 0) {
    params.tags.forEach((tag) => {
      queryParams.tags = tag; // Can be used multiple times
    });
  }
  if (params?.ordering) {
    queryParams.ordering = params.ordering;
  }
  if (params?.page) {
    queryParams.page = params.page.toString();
  }
  if (params?.page_size) {
    queryParams.page_size = params.page_size.toString();
  }

  const response = await api.get<PaginatedResponse<ProductSummary>>(
    `/categories/${categorySlug}/products/`,
    { params: queryParams }
  );
  
  // Normalize the response
  const data = response.data;
  return {
    ...data,
    results: data.results.map((item) => ({
      ...item,
      lowestPrice: item.lowestPrice ?? item.lowest_price
    }))
  };
}

/**
 * Get all subcategories for a parent category
 * @param categorySlug - The slug of the parent category
 * @returns Array of subcategories
 */
export async function getCategorySubcategories(
  categorySlug: string
): Promise<Category[]> {
  const response = await api.get<{ results: Category[] } | Category[]>(
    `/categories/${categorySlug}/subcategories/`
  );
  return Array.isArray(response.data) ? response.data : response.data.results || [];
}

/**
 * Get all parent categories (categories without a parent)
 * @param page - Optional page number for pagination
 * @param pageSize - Optional page size
 * @returns Paginated response with parent categories
 */
export async function getParentCategories(
  page?: number,
  pageSize?: number
): Promise<PaginatedResponse<Category> | Category[]> {
  const params: Record<string, string> = {};
  if (page) {
    params.page = page.toString();
  }
  if (pageSize) {
    params.page_size = pageSize.toString();
  }

  const response = await api.get<PaginatedResponse<Category> | Category[]>(
    '/categories/parents/',
    { params }
  );
  
  return response.data;
}

/**
 * Get a single category by slug
 * @param categorySlug - The slug of the category
 * @returns Category object with children
 */
export async function getCategory(categorySlug: string): Promise<Category> {
  const response = await api.get<Category>(`/categories/${categorySlug}/`);
  return response.data;
}

/**
 * Get all categories (with optional search)
 * Fetches all categories in a single request without pagination
 * @param search - Optional search term
 * @returns Array of categories
 */
export async function getAllCategories(search?: string): Promise<Category[]> {
  const params: Record<string, string> = {};
  if (search) {
    params.search = search;
  }
  
  // Request all categories at once with a very large page_size to avoid pagination
  const response = await api.get<PaginatedResponse<Category> | { results: Category[] } | Category[]>(
    '/categories/',
    { params: { ...params, page_size: '1000' } } // Large page size to get all categories in one request
  );
  
  // Handle different response formats
  if (Array.isArray(response.data)) {
    return response.data;
  } else if ('results' in response.data) {
    return response.data.results || [];
  }
  
  return [];
}

