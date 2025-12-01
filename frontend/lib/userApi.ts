import api from './apiClient';
import type { PaginatedResponse } from './types';

export type User = {
  id: number;
  username: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: 'visitor' | 'user' | 'client' | 'admin';
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined: string;
  last_login?: string | null;
  products_count?: number;
  products?: Array<{
    id: number;
    name: string;
    slug: string;
    image?: string;
    approval_status?: 'pending' | 'approved' | 'rejected';
    created_at?: string;
  }>;
};

// Get auth header helper
function getAuthHeader(token: string | null) {
  if (!token) return {};
  return { Authorization: `Token ${token}` };
}

// Get all users (admin only) - only returns clients (non-admin users)
export async function getAllUsers(
  token: string | null,
  page: number = 1,
  role?: string, // This parameter is kept for compatibility but ignored by backend
  isActive?: boolean,
  search?: string
): Promise<PaginatedResponse<User>> {
  const params: Record<string, string> = { page: page.toString() };
  // Note: role filter is removed - backend only returns clients
  if (isActive !== undefined) {
    params.is_active = isActive.toString();
  }
  if (search) {
    params.search = search;
  }
  
  const response = await api.get<PaginatedResponse<User>>('/users/', {
    headers: getAuthHeader(token),
    params
  });
  return response.data;
}

// Get user details (admin only)
export async function getUserDetails(
  userId: number,
  token: string | null
): Promise<User> {
  const response = await api.get<User>(`/users/${userId}/`, {
    headers: getAuthHeader(token)
  });
  return response.data;
}

// Get user products (admin only)
export async function getUserProducts(
  userId: number,
  token: string | null,
  page: number = 1,
  approvalStatus?: string,
  search?: string
): Promise<PaginatedResponse<any>> {
  const params: Record<string, string> = { page: page.toString() };
  if (approvalStatus) {
    params.approval_status = approvalStatus;
  }
  if (search) {
    params.search = search;
  }
  
  const response = await api.get<PaginatedResponse<any>>(`/users/${userId}/products/`, {
    headers: getAuthHeader(token),
    params
  });
  return response.data;
}

// Activate user account (admin only)
export async function activateUser(
  userId: number,
  token: string | null
): Promise<User> {
  const response = await api.post<User>(`/users/${userId}/activate/`, {}, {
    headers: getAuthHeader(token)
  });
  return response.data;
}

// Deactivate user account (admin only)
export async function deactivateUser(
  userId: number,
  token: string | null
): Promise<User> {
  const response = await api.post<User>(`/users/${userId}/deactivate/`, {}, {
    headers: getAuthHeader(token)
  });
  return response.data;
}

