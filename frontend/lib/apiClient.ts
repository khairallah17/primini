import axios from 'axios';

const baseURL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');
const api = axios.create({
  baseURL,
  withCredentials: true
});

export default api;
