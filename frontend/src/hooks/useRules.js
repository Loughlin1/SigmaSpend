// src/hooks/useRules.js
import { useState, useCallback } from 'react';
import { rulesApi } from '../api/client';

export default function useRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rulesApi.getAll();
      setRules(data);
    } catch (err) {
      console.error('Failed fetching processing rules:', err);
      setError('Could not download rule indexes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (payload) => {
    try {
      await rulesApi.create(payload);
      await fetchRules(); // Synchronise local layout tree
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [fetchRules]);

  const deleteRule = useCallback(async (id) => {
    try {
      await rulesApi.delete(id);
      await fetchRules();
    } catch (err) {
      console.error(err);
    }
  }, [fetchRules]);

  return { rules, loading, error, fetchRules, createRule, deleteRule };
}