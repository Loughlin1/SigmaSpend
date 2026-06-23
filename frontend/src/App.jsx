// src/App.jsx
import './App.css';
import React, { useState, useEffect } from 'react';

import Header from './components/Header';
import Footer from './components/Footer';
import DescriptionSection from './components/Description';
import StatementUpload from './components/StatementUpload';
import ExpenseChart from './components/ExpenseChart';
import BankAccountList from './components/BankAccountList';

import LedgerSection from './features/ledger/components/LedgerSection';
import CategoryManager from './components/CategoryManager';
import RuleManager from './components/RuleManager';
import AnalyticsFilters from './components/AnalyticsFilters'; // Import your new component

// Custom Hooks
import useAccounts from './hooks/useAccounts';
import useCategories from './hooks/useCategories';
import useRules from './hooks/useRules';
import useExpenseAnalytics from './hooks/useExpenseAnalytics';

function App() {
  // Global Shared Ecosystem Hooks
  // const { expenses, loading: expensesLoading, error: expensesError, fetchExpenses, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { categories, loading: categoriesLoading, error: categoriesError, fetchCategories, createCategory } = useCategories();
  const { rules, pagination, loading: rulesLoading, error: rulesError, fetchRules, createRule, deleteRule, createRuleFromTransaction } = useRules();
  const { summaryData, loading: analyticsLoading, error: analyticsError, fetchSummary } = useExpenseAnalytics();
  
  const [chartFilters, setChartFilters] = useState({
    group_by: 'month',
    start_date: '2026-01-01', 
    end_date: '2026-12-31',
    account_id: ''
  });

  const [showAccountForm, setShowAccountForm] = useState(false);

  // ⚡ OPTIMIZED EFFECT MATCHING
  useEffect(() => {
    fetchSummary(chartFilters);
    // Track individual fields uniquely or serialize to ensure accurate execution tracking
  }, [fetchSummary, chartFilters.group_by, chartFilters.start_date, chartFilters.end_date, chartFilters.account_id]);

  // 3. Fetch Accounts, Categories, and Rules on initial mount
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchRules();
  }, [fetchAccounts, fetchCategories, fetchRules]);

  const handleAccountCreated = async () => {
    await fetchAccounts();
    setShowAccountForm(false);
  };

  // Simplified trigger to refresh charts when ledger manipulations happen down below
  const triggerGlobalRefresh = async () => {
      await fetchSummary(chartFilters);
    };

  const handleCreateRule = async (ruleData) => {
    await createRule(ruleData);
    await fetchRules(); 
  };

  const handleDeleteRule = async (ruleId) => {
    await deleteRule(ruleId);
    await fetchRules(); 
  };

  return (
    <div className="page">
      <Header />

      <section className="sectionCard">
        <div className="splitSection">
          <DescriptionSection />
          <StatementUpload 
            accounts={accounts} 
            onUploadSuccess={async () => { 
              await triggerGlobalRefresh(); 
              await fetchRules(); 
            }} 
          />
        </div>
      </section>

      <section className="sectionCard">
        <BankAccountList
          accounts={accounts}
          loading={accountsLoading}
          error={accountsError}
          onAccountUpdated={fetchAccounts}
          onAccountCreated={handleAccountCreated}
          showAccountForm={showAccountForm}
          setShowAccountForm={setShowAccountForm}
        />
      </section>

      <section className="sectionCard">
        <CategoryManager
          categories={categories}
          onCreateCategory={createCategory}
          loading={categoriesLoading}
          error={categoriesError}
        />
      </section>

      <section className="sectionCard">
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
      </section>

      {/* --- RECONCILED ANALYTICS CHART SECTION --- */}
      <section className="sectionCard">
        <div className="headingRow" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Financial Summaries</h2>
          {/* New Isolated Component handles filtering states safely without losing cursor focus */}
          <AnalyticsFilters 
            chartFilters={chartFilters}
            onFilterChange={setChartFilters}
            accounts={accounts}
          />
        </div>

        {analyticsError && <p className="errorText">Error loading aggregations: {analyticsError.message}</p>}
        
        <ExpenseChart
          expenses={summaryData} 
          accounts={accounts}
          loading={analyticsLoading}
        />
      </section>

      {/* --- TRANSACTION LEDGER SECTION --- */}
      <LedgerSection
        accountNameMap={accountNameMap}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoriesError={categoriesError}
        triggerGlobalRefresh={triggerGlobalRefresh}
        createRuleFromTransaction={createRuleFromTransaction}
      />
      <Footer />
    </div>
  );
}

export default App;