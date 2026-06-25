// src/features/budget/hooks/useBudget.js
import { useState, useCallback, useEffect } from 'react';
import { expenseApi, budgetApi, bucketBudgetApi, incomeApi, categoryApi } from '../../../api/client';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils';

export default function useBudget() {
  const [budgets, setBudgets] = useState({});
  const [bucketBudgets, setBucketBudgets] = useState({});
  const [actuals, setActuals] = useState({});
  const [subActuals, setSubActuals] = useState({});
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

  const fetchBucketBudgets = useCallback(async () => {
    try {
      const data = await bucketBudgetApi.getAll();
      const map = {};
      data.forEach(b => { map[b.bucket_key] = parseFloat(b.amount); });
      setBucketBudgets(map);
    } catch (err) {
      console.error('Failed to load bucket budgets', err);
    }
  }, []);

  const updateBucketBudget = useCallback(async (bucketKey, amount) => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || amount === '') {
      setBucketBudgets(prev => { const next = { ...prev }; delete next[bucketKey]; return next; });
      try { await bucketBudgetApi.delete(bucketKey); } catch { /* already gone */ }
      return;
    }
    setBucketBudgets(prev => ({ ...prev, [bucketKey]: parsed }));
    try {
      await bucketBudgetApi.upsert(bucketKey, parsed);
    } catch (err) {
      console.error('Failed to save bucket budget', err);
      fetchBucketBudgets();
    }
  }, [fetchBucketBudgets]);

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
      const subMap = {};
      (data || []).forEach(row => {
        const type = String(row.type).toLowerCase();
        const name = row.category_name || 'Uncategorized';
        const spent = -parseFloat(row.net || 0);
        if (type === 'category') {
          map[name] = (map[name] || 0) + spent;
        } else if (type === 'subcategory') {
          subMap[name] = (subMap[name] || 0) + spent;
        }
      });
      setActuals(map);
      setSubActuals(subMap);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchBudgets();
    fetchBucketBudgets();
    fetchIncome();
    fetchActuals();
  }, [fetchBudgets, fetchBucketBudgets, fetchIncome, fetchActuals]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { budgets, updateBudget, bucketBudgets, updateBucketBudget, actuals, subActuals, monthlyIncome, updateIncome, updateBucket, loading, error, fetchActuals };
}
