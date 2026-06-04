import { useState, useEffect, useCallback } from 'react';
import { expenseApi } from '../api/client';

export default function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await expenseApi.getAll({ limit: 100 });
      setExpenses(data);
      setError(null);
    } catch (err) {
      console.error('Failed fetching ledger data', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = useCallback(
    async (payload) => {
      try {
        await expenseApi.create(payload);
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
