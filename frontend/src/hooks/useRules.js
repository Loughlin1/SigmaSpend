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
    await rulesApi.create(ruleData);
    await fetchRules(); // Automatically sync numbers following direct creations
  }, [fetchRules]);

  const deleteRule = useCallback(async (ruleId) => {
    await rulesApi.delete(ruleId);
    await fetchRules();
  }, [fetchRules]);

  const createRuleFromTransaction = useCallback(async ({ description, notes, target_category, matchField }) => {
  try {
    const rawTextSource = matchField === 'notes' ? notes : description;
    
    if (!rawTextSource) {
      console.warn("[SigmaSpend Hook] Automated rule aborted: Target text source is blank.");
      return;
    }

    // --- OPTIMIZED EXTRACTOR FOR MULTI-WORD BRANDS ---
    const cleanKeyword = rawTextSource
      // 1. Remove obvious transaction noise like dates (e.g., 12/04 or 2026-04-11)
      .replace(/\d{2,4}[-/.]\d{2}[-/.]\d{2,4}/g, '')
      .replace(/\d{2}[-/.]\d{2}/g, '')
      
      // 2. Remove strings of purely consecutive numbers (like card endings or store IDs: #3421)
      .replace(/\b\d{4,}\b/g, '')
      .replace(/#\d+/g, '')
      
      // 3. Convert multiple spaces or symbols into single clean spaces
      .replace(/[\s*]+/g, ' ')
      
      // 4. Strip out trailing/leading special characters but PRESERVE internal signs like '+' or '&'
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
      
      .trim()
      .toLowerCase();

    // Safety fallback guard clause
    if (cleanKeyword.length < 3) {
      console.warn(`[SigmaSpend Hook] Cleaned token "${cleanKeyword}" too short for a safe rule.`);
      return;
    }

    console.log(`[SigmaSpend Hook] Registering composite keyword rule: "${cleanKeyword}"`);

    // Dispatch the payload to your FastAPI Pydantic endpoint contract
    await createRule({
      keyword: cleanKeyword,          // Now cleanly passes "snow + rock"
      target_category: target_category,
      match_field: matchField 
    });

    // Sync your local frontend metrics cache instantly
    await fetchRules();
    
  } catch (err) {
    console.error("[SigmaSpend Hook] Network loop failed inside createRuleFromTransaction:", err);
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