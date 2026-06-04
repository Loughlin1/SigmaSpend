import { useState, useCallback } from 'react';
import { expenseApi } from '../api/client';

export default function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Accept optional filter arguments from the UI layer
  const fetchExpenses = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      // Clean up empty strings or null values so they don't pollute query params
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      // Merge defaults with the active filter state
      const data = await expenseApi.getAll({ 
        limit: 100, 
        ...cleanFilters 
      });
      
      setExpenses(data);
      setError(null);
    } catch (err) {
      console.error('Failed fetching ledger data', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createExpense = useCallback(
    async (payload) => {
      try {
        await expenseApi.create(payload);
        // Fallback fetch if called without explicit filter updates downstream
        await fetchExpenses();
      } catch (err) {
        console.error('Failed creating record', err);
        throw err;
      }
    },
    [fetchExpenses]
  );

  const updateExpense = useCallback(
    async (id, payload) => {
      try {
        await expenseApi.update(id, payload);
        await fetchExpenses();
      } catch (err) {
        console.error('Failed updating record', err);
        throw err;
      }
    },
    [fetchExpenses]
  );

  const deleteExpense = useCallback(
    async (id) => {
      try {
        await expenseApi.delete(id);
        await fetchExpenses();
      } catch (err) {
        console.error('Failed deleting record', err);
        throw err;
      }
    },
    [fetchExpenses]
  );

  return {
    expenses,
    loading,
    error,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    setExpenses,
  };
}