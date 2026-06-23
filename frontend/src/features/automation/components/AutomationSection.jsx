// src/features/automation/components/AutomationSection.jsx
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import RuleManager from './RuleManager';
import useRules from '../hooks/useRules';

const AutomationSection = forwardRef(({ categories, triggerGlobalRefresh }, ref) => {
  const { 
    rules, 
    pagination, 
    loading: rulesLoading, 
    error: rulesError, 
    fetchRules, 
    createRule, 
    deleteRule 
  } = useRules();

  // Initial Fetch on load
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Expose fetchRules upward to App.jsx via a ref template
  useImperativeHandle(ref, () => ({
    refreshRules: () => {
      fetchRules();
    }
  }));

  const handleCreateRule = async (ruleData) => {
    await createRule(ruleData);
    await fetchRules();
    if (typeof triggerGlobalRefresh === 'function') await triggerGlobalRefresh();
  };

  const handleDeleteRule = async (ruleId) => {
    await deleteRule(ruleId);
    await fetchRules();
    if (typeof triggerGlobalRefresh === 'function') await triggerGlobalRefresh();
  };

  return (
    <RuleManager
      rules={rules}
      pagination={pagination}
      categories={categories}
      onCreateRule={handleCreateRule}
      onDeleteRule={handleDeleteRule}
      fetchRules={fetchRules}
      loading={rulesLoading}
      error={rulesError}
    />
  );
});

export default AutomationSection;