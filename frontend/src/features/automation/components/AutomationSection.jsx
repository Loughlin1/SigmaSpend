// src/features/automation/components/AutomationSection.jsx
import { useEffect, useImperativeHandle, forwardRef } from 'react';
import RuleManager from './RuleManager/RuleManager';
import useRules from '../hooks/useRules';

const AutomationSection = forwardRef(({ categories, triggerGlobalRefresh }, ref) => {
  const {
    rules,
    pagination,
    loading: rulesLoading,
    error: rulesError,
    fetchRules,
    createRule,
    deleteRule,
    createRuleFromTransaction,
  } = useRules();

  // Initial Fetch on load
  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Expose fetchRules upward to App.jsx via a ref template
  useImperativeHandle(ref, () => ({
    refreshRules: () => fetchRules(),
    createRuleFromTransaction: (ruleData) => createRuleFromTransaction(ruleData),
  }));

  const handleCreateRule = async (ruleData) => {
    await createRule(ruleData);
    await fetchRules();
    if (typeof triggerGlobalRefresh === 'function') await triggerGlobalRefresh();
  };

  const handleUpdateRule = async () => {
    // update endpoint not yet implemented — refresh list to stay in sync
    await fetchRules();
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
      onUpdateRule={handleUpdateRule}
      onDeleteRule={handleDeleteRule}
      fetchRules={fetchRules}
      loading={rulesLoading}
      error={rulesError}
    />
  );
});

export default AutomationSection;