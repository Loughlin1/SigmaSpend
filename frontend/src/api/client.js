// src/api/client.js
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
  getSummary: (params) => apiClient.get('/expenses/analytics/summary', { params }).then(res => res.data),
  getYears: (params) => apiClient.get('/expenses/analytics/years', { params }).then(res => res.data),
  bulkClassify: (expenseIds, categoryId) =>
    apiClient.post('/expenses/bulk-classify', {
      expense_ids: expenseIds,
      category_id: categoryId
    }).then(res => res.data),
  bulkDelete: (expenseIds) =>
    apiClient.post('/expenses/bulk-delete', { expense_ids: expenseIds }).then(res => res.data),
  bulkUpdateType: (expenseIds, isIncome) =>
    apiClient.post('/expenses/bulk-update-type', { expense_ids: expenseIds, is_income: isIncome }).then(res => res.data),
  bulkReclassify: (expenseIds) =>
    apiClient.post('/expenses/bulk-reclassify', { expense_ids: expenseIds }).then(res => res.data),
};

export const ingestionApi = {
  uploadStatement: (files, accountId) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => formData.append('files', file));
    } else {
      formData.append('files', files);
    }
    return apiClient.post(`/upload/statement?account_id=${encodeURIComponent(accountId)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
};

export const accountsApi = {
  getAccounts: (params) => apiClient.get('/accounts/', { params }).then(res => res.data),
  createAccount: (data) => apiClient.post('/accounts/', data).then(res => res.data),
  updateAccount: (accountId, data) => apiClient.put(`/accounts/${encodeURIComponent(accountId)}`, data).then(res => res.data),
};

export const categoryApi = {
  getAll: () => apiClient.get('/categories/').then(res => res.data),
  create: (data) => apiClient.post('/categories/', data).then(res => res.data),
  updateBucket: (categoryId, bucket) =>
    apiClient.patch(`/categories/${categoryId}/bucket`, { bucket }).then(res => res.data),
};

export const incomeApi = {
  get: () => apiClient.get('/income/').then(res => res.data),
  update: (monthly_net_income) => apiClient.put('/income/', { monthly_net_income }).then(res => res.data),
};

export const banksApi = {
  getAll: () => apiClient.get('/banks/').then(res => res.data),
};

export const rulesApi = {
  getAll: (params) => apiClient.get('/rules/', { params }).then(res => res.data),
  create: (payload) => apiClient.post('/rules/', payload).then(res => res.data),
  delete: (id) => apiClient.delete(`/rules/${id}`).then(res => res.data),
};

export const budgetApi = {
  getAll: () => apiClient.get('/budgets/').then(res => res.data),
  upsert: (categoryId, data) => apiClient.put(`/budgets/${categoryId}`, data).then(res => res.data),
  delete: (categoryId) => apiClient.delete(`/budgets/${categoryId}`).then(res => res.data),
};

export const logsApi = {
  getLogs: (params) => apiClient.get('/logs', { params }).then(res => res.data),
  getModules: () => apiClient.get('/logs/modules').then(res => res.data),
  getLevels: () => apiClient.get('/logs/levels').then(res => res.data),
};