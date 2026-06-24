// src/features/budget/hooks/useBudget.js
import { useState, useCallback, useEffect } from 'react';
import { expenseApi } from '../../../api/client';
import { getCurrentMonthBounds } from '../../../utils/calendarUtils';

const STORAGE_KEY = 'sigmaSpend_budgets';

function loadBudgets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBudgets(budgets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export default function useBudget() {
  const [budgets, setBudgetsState] = useState(loadBudgets);
  const [actuals, setActuals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateBudget = useCallback((categoryName, amount) => {
    setBudgetsState(prev => {
      const next = { ...prev, [categoryName]: amount === '' ? '' : parseFloat(amount) || 0 };
      saveBudgets(next);
      return next;
    });
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
      // Build a map of category name → total_expenses for parent categories
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
    fetchActuals();
  }, [fetchActuals]);

  return { budgets, updateBudget, actuals, loading, error, fetchActuals };
}
