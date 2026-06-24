// src/features/budget/hooks/useBudget.js
import { useState, useCallback, useEffect } from 'react';
import { expenseApi, budgetApi } from '../../../api/client';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils';

export default function useBudget() {
  // budgets keyed by category_id: { [category_id]: { amount, period } }
  const [budgets, setBudgets] = useState({});
  const [actuals, setActuals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    try {
      const data = await budgetApi.getAll();
      const map = {};
      data.forEach(b => { map[b.category_id] = { amount: b.amount, period: b.period }; });
      setBudgets(map);
    } catch (err) {
      console.error('Failed to load budgets', err);
    }
  }, []);

  const updateBudget = useCallback(async (categoryId, amount, period = 'monthly') => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || amount === '') {
      // Empty input — delete the budget row
      try {
        await budgetApi.delete(categoryId);
        setBudgets(prev => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
      } catch {
        // If there was no budget to delete, that's fine
        setBudgets(prev => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
      }
      return;
    }

    // Optimistic update
    setBudgets(prev => ({ ...prev, [categoryId]: { amount: parsed, period } }));
    try {
      await budgetApi.upsert(categoryId, { amount: parsed, period });
    } catch (err) {
      console.error('Failed to save budget', err);
      fetchBudgets(); // Revert on failure
    }
  }, [fetchBudgets]);

  const fetchActuals = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getCurrentMonthBounds();
      const params = {
        group_by: 'month',
        start_date: filters.start_date || start,
        end_date: filters.end_date || end,
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
      };
      const data = await expenseApi.getSummary(params);
      const map = {};
      (data || [])
        .filter(row => String(row.type).toLowerCase() === 'category')
        .forEach(row => {
          const name = row.category_name || 'Uncategorized';
          map[name] = (map[name] || 0) + parseFloat(row.total_expenses || 0);
        });
      setActuals(map);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    fetchActuals();
  }, [fetchBudgets, fetchActuals]);

  return { budgets, updateBudget, actuals, loading, error, fetchActuals };
}
