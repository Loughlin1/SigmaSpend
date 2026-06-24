// src/features/budget/hooks/useBudget.js
import { useState, useCallback, useEffect } from 'react';
import { expenseApi, budgetApi, incomeApi, categoryApi } from '../../../api/client';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils';

export default function useBudget() {
  const [budgets, setBudgets] = useState({});
  const [actuals, setActuals] = useState({});
  const [monthlyIncome, setMonthlyIncome] = useState('');
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

  const fetchIncome = useCallback(async () => {
    try {
      const data = await incomeApi.get();
      setMonthlyIncome(data.monthly_net_income > 0 ? data.monthly_net_income : '');
    } catch (err) {
      console.error('Failed to load income settings', err);
    }
  }, []);

  const updateBudget = useCallback(async (categoryId, amount, period = 'monthly') => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || amount === '') {
      try { await budgetApi.delete(categoryId); } catch { /* already gone */ }
      setBudgets(prev => { const next = { ...prev }; delete next[categoryId]; return next; });
      return;
    }
    setBudgets(prev => ({ ...prev, [categoryId]: { amount: parsed, period } }));
    try {
      await budgetApi.upsert(categoryId, { amount: parsed, period });
    } catch (err) {
      console.error('Failed to save budget', err);
      fetchBudgets();
    }
  }, [fetchBudgets]);

  const updateIncome = useCallback(async (value) => {
    const parsed = parseFloat(value);
    setMonthlyIncome(value);
    if (isNaN(parsed) || value === '') return;
    try {
      await incomeApi.update(parsed);
    } catch (err) {
      console.error('Failed to save income', err);
      fetchIncome();
    }
  }, [fetchIncome]);

  const updateBucket = useCallback(async (categoryId, bucket) => {
    try {
      await categoryApi.updateBucket(categoryId, bucket || null);
    } catch (err) {
      console.error('Failed to save bucket', err);
    }
  }, []);

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchBudgets();
    fetchIncome();
    fetchActuals();
  }, [fetchBudgets, fetchIncome, fetchActuals]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { budgets, updateBudget, actuals, monthlyIncome, updateIncome, updateBucket, loading, error, fetchActuals };
}
