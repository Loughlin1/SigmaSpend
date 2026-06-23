// src/features/automation/hooks/useRules.js
import { useState, useCallback } from 'react';
import { rulesApi } from '../../../api/client';

export default function useRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const fetchRules = useCallback(async (searchTerm = "", page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: 10,
        ...(searchTerm ? { q: searchTerm } : {})
      };
      
      const data = await rulesApi.getAll(params);
      
      // Extract structural elements from backend PaginatedCategoryRuleResponse
      setRules(data.items || []);
      setPagination({
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0
      });
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
      // Refresh back to page 1 to let users see their newly added rule
      await fetchRules("", 1); 
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
      // Stay on the current page context safely
      await fetchRules("", pagination.page);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete rule');
    } finally {
      setLoading(false);
    }
  }, [fetchRules, pagination.page]);

  const createRuleFromTransaction = useCallback(async ({ keyword, match_field, category_id }) => {
    try {
      if (!keyword) return;

      const cleanKeyword = keyword
        .replace(/\d{2,4}[-/.]\d{2}[-/.]\d{2,4}/g, '')
        .replace(/\d{2}[-/.]\d{2}/g, '')
        .replace(/\b\d{4,}\b/g, '')
        .replace(/#\d+/g, '')
        .replace(/[\s*]+/g, ' ')
        .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
        .trim()
        .toLowerCase();

      if (cleanKeyword.length < 3) return;

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
    pagination,
    loading,
    error,
    fetchRules,
    createRule,
    deleteRule,
    createRuleFromTransaction
  };
}