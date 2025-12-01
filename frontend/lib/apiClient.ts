import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api',
  // withCredentials not needed for Token authentication
  // Only needed if using session-based authentication
  withCredentials: false
});

export default api;
