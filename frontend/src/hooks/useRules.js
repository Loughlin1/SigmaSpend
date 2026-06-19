// src/hooks/useRules.js
import { useState, useCallback } from 'react';
import { rulesApi } from '../api/client';

export default function useRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ⚡ FIXED: Uses unified Axios client mappings with parameters matching backend
  const fetchRules = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = searchTerm ? { q: searchTerm } : {};
      const data = await rulesApi.getAll(params);
      setRules(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (ruleData) => {
    setLoading(true);
    try {
      await rulesApi.create(ruleData);
      await fetchRules(); 
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create rule');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRules]);

  const deleteRule = useCallback(async (ruleId) => {
    setLoading(true);
    try {
      await rulesApi.delete(ruleId);
      await fetchRules();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete rule');
    } finally {
      setLoading(false);
    }
  }, [fetchRules]);

  const createRuleFromTransaction = useCallback(async ({ keyword, match_field, category_id }) => {
    try {
      if (!keyword) {
        console.warn("[SigmaSpend Hook] Automated rule aborted: Target text source is blank.");
        return;
      }

      const cleanKeyword = keyword
        .replace(/\d{2,4}[-/.]\d{2}[-/.]\d{2,4}/g, '')
        .replace(/\d{2}[-/.]\d{2}/g, '')
        .replace(/\b\d{4,}\b/g, '')
        .replace(/#\d+/g, '')
        .replace(/[\s*]+/g, ' ')
        .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
        .trim()
        .toLowerCase();

      if (cleanKeyword.length < 3) {
        console.warn(`[SigmaSpend Hook] Cleaned token "${cleanKeyword}" too short for a safe rule.`);
        return;
      }

      console.log(`[SigmaSpend Hook] Registering composite keyword rule: "${cleanKeyword}"`);

      await createRule({
        keyword: cleanKeyword,
        category_id: category_id,
        match_field: match_field
      });
      
    } catch (err) {
      console.error("[SigmaSpend Hook] Rule engine creation failed:", err);
    }
  }, [createRule]);

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    deleteRule,
    createRuleFromTransaction
  };
}