// src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',           // so api.get('/cart') → GET http://localhost:5173/api/cart
  withCredentials: true,     // send/receive the session cookie
});

export default api;
