// src/hooks/useRules.js
import { useState, useCallback } from 'react';
import { rulesApi } from '../api/client'; // Assuming your standard Axios/Fetch client paths

export default function useRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await rulesApi.getAll();
      setRules(response.data || response);
    } catch (err) {
      setError(err.message || 'Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (ruleData) => {
    await rulesApi.createRule(ruleData);
    await fetchRules(); // Automatically sync numbers following direct creations
  }, [fetchRules]);

  const deleteRule = useCallback(async (ruleId) => {
    await rulesApi.deleteRule(ruleId);
    await fetchRules();
  }, [fetchRules]);

  const createRuleFromTransaction = useCallback(async ({ description, notes, target_category, matchField }) => {
  try {
    // 1. Pick the correct reference text source string based on user intent
    const rawTextSource = matchField === 'notes' ? notes : description;
    
    if (!rawTextSource) {
      console.warn("Target string source is empty. Auto-rule generation skipped.");
      return;
    }

    // 2. Extract and clean the leading keyword anchor token
    const cleanKeyword = rawTextSource
      .split(/[\s*]+/)[0]                   
      .replace(/[^a-zA-Z0-9]/g, '')         
      .trim()
      .toLowerCase();

    if (cleanKeyword.length < 3) {
      console.warn("Extracted keyword token too short for a safe automated rule match.");
      return;
    }

    // 3. Dispatch payload including the precise structural match_field target
    await rulesApi.createRule({
      keyword: cleanKeyword,
      target_category: target_category,
      match_field: matchField // Passes "description" or "notes" explicitly
    });

    await fetchRules();
  } catch (err) {
    console.error("Failed to automatically generate a background keyword rule", err);
  }
}, [fetchRules]);

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    deleteRule,
    createRuleFromTransaction // ◄ Expose this cleanly to components
  };
}