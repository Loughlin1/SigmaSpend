import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const expenseApi = {
  getAll: (params) => apiClient.get('/expenses', { params }).then(res => res.data),
  create: (data) => apiClient.post('/expenses', data).then(res => res.data),
  update: (id, data) => apiClient.put(`/expenses/${id}`, data).then(res => res.data),
  delete: (id) => apiClient.delete(`/expenses/${id}`).then(res => res.data),
};

export const ingestionApi = {
  uploadStatement: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/ingestion/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
};