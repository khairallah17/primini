import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
});

api.interceptors.request.use((config) => {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('primini:authToken');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export async function fetchHomeContent() {
  const [categories, promotions, popular] = await Promise.all([
    api.get('categories/'),
    api.get('promotions/'),
    api.get('popular-products/'),
  ]);
  return {
    categories: categories.data.results || categories.data,
    promotions: promotions.data.results || promotions.data,
    popular: popular.data.results || popular.data,
  };
}

export async function fetchProducts(params) {
  const response = await api.get('products/', { params });
  return response.data;
}

export async function fetchProduct(slug) {
  const response = await api.get(`products/${slug}/`);
  return response.data;
}

export async function searchProducts(query, page = 1) {
  const response = await api.get('products/search/', { params: { q: query, page } });
  return response.data;
}

export async function fetchDeals(params = {}) {
  const response = await api.get('offers/', { params: { ordering: 'price', ...params } });
  return response.data;
}

export async function fetchCategories() {
  const response = await api.get('categories/');
  return response.data.results || response.data;
}

export async function fetchFaq(section) {
  const response = await api.get('faqs/', { params: section ? { section } : {} });
  return response.data.results || response.data;
}

export async function fetchPage(slug) {
  const response = await api.get(`pages/${slug}/`);
  return response.data;
}

export async function createMagicLookup(link) {
  const response = await api.post('products/magic_lookup/', { link });
  return response.data;
}

export async function login(credentials) {
  const response = await api.post('auth/login/', credentials);
  return response.data;
}

export async function register(data) {
  const response = await api.post('auth/registration/', data);
  return response.data;
}

export async function requestPasswordReset(email) {
  const response = await api.post('auth/password/reset/', { email });
  return response.data;
}

export async function refreshUser(token) {
  if (!token) return null;
  const response = await api.get('auth/user/', {
    headers: { Authorization: `Token ${token}` },
  });
  return response.data;
}

export async function logout() {
  await api.post('auth/logout/');
}

export async function createAlert(payload) {
  const response = await api.post('alerts/', payload);
  return response.data;
}

export async function updateAlert(id, payload) {
  const response = await api.patch(`alerts/${id}/`, payload);
  return response.data;
}

export async function deleteAlert(id) {
  await api.delete(`alerts/${id}/`);
}

export default api;

