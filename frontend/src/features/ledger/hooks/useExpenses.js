// src/features/ledger/hooks/useExpenses.js
import { useState, useCallback } from 'react';
import { expenseApi } from '../../../api/client';

export default function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0); 

  const fetchExpenses = useCallback(async (filters = {}, currentPage = page, currentLimit = limit) => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      // Pass pagination parameters to the API client
      const response = await expenseApi.getAll({ 
        limit: currentLimit,
        skip: (currentPage - 1) * currentLimit, // common pattern for FastAPI/SQLAlchemy offset
        page: currentPage,                     // fallback if your client expects page directly
        ...cleanFilters 
      });

      const envelope = response?.items ? response : response?.data;
      
      if (envelope && Array.isArray(envelope.items)) {
        setExpenses(envelope.items);
        setTotalCount(envelope.total_count || 0);
      } else {
        // Safe structural fallback if the network payload lands unexpectedly
        setExpenses([]);
        setTotalCount(0);
        console.warn("[SigmaSpend UI] API returned unexpected non-envelope structural data format:", response);
      }
      setError(null);
    } catch (err) {
      console.error('Failed fetching ledger data', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const changePage = useCallback((newPage, activeFilters = {}) => {
    setPage(newPage);
    fetchExpenses(activeFilters, newPage, limit);
  }, [fetchExpenses, limit]);

  const changeLimit = useCallback((newLimit, activeFilters = {}) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 on limit change
    fetchExpenses(activeFilters, 1, newLimit);
  }, [fetchExpenses]);

  const createExpense = useCallback(async (payload, activeFilters = {}) => {
    try {
      await expenseApi.create(payload);
      await fetchExpenses(activeFilters);
    } catch (err) {
      console.error('Failed creating record', err);
      throw err;
    }
  }, [fetchExpenses]);

  const updateExpense = useCallback(async (id, payload, activeFilters = {}) => {
    try {
      await expenseApi.update(id, payload);
      await fetchExpenses(activeFilters);
    } catch (err) {
      console.error('Failed updating record', err);
      throw err;
    }
  }, [fetchExpenses]);

  const deleteExpense = useCallback(async (id, activeFilters = {}) => {
    try {
      await expenseApi.delete(id);
      await fetchExpenses(activeFilters);
    } catch (err) {
      console.error('Failed deleting record', err);
      throw err;
    }
  }, [fetchExpenses]);

  return {
    expenses,
    loading,
    error,
    page,
    limit,
    totalCount,
    changePage,
    changeLimit,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    setExpenses,
  };
}