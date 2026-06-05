import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const expenseApi = {
  getAll: (params) => apiClient.get('/expenses/', { params }).then(res => res.data),
  create: (data) => apiClient.post('/expenses/', data).then(res => res.data),
  update: (id, data) => apiClient.put(`/expenses/${id}`, data).then(res => res.data),
  delete: (id) => apiClient.delete(`/expenses/${id}`).then(res => res.data),
};

export const ingestionApi = {
  uploadStatement: (files, accountId) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => formData.append('files', file));
    } else {
      formData.append('files', files);
    }
    return apiClient.post(`/upload/csv?account_id=${encodeURIComponent(accountId)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
  getAccounts: (params) => apiClient.get('/accounts', { params }).then(res => res.data),
  createAccount: (data) => apiClient.post('/accounts', data).then(res => res.data),
  updateAccount: (accountId, data) => apiClient.put(`/accounts/${encodeURIComponent(accountId)}`, data).then(res => res.data),
};

export const categoryApi = {
  getAll: () => apiClient.get('/categories/').then(res => res.data),
  create: (data) => apiClient.post('/categories/', data).then(res => res.data),
};