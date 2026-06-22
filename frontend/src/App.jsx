// src/App.jsx
import './App.css';
import React, { useState, useEffect } from 'react';

import Header from './components/Header';
import Footer from './components/Footer';
import DescriptionSection from './components/Description';
import ExpenseForm from './components/ExpenseForm';
import StatementUpload from './components/StatementUpload';
import ExpenseChart from './components/ExpenseChart';
import BankAccountList from './components/BankAccountList';
import LedgerTable from './components/LedgerTable';
import LedgerFilters from './components/LedgerFilters';
import CategoryManager from './components/CategoryManager';
import RuleManager from './components/RuleManager';
import AnalyticsFilters from './components/AnalyticsFilters'; // Import your new component

// Custom Hooks
import useExpenses from './hooks/useExpenses';
import useAccounts from './hooks/useAccounts';
import useExpenseForm from './hooks/useExpenseForm';
import useExpenseFilters from './hooks/useExpenseFilters';
import useCategories from './hooks/useCategories';
import useRules from './hooks/useRules';
import useExpenseAnalytics from './hooks/useExpenseAnalytics';

function App() {
  const { expenses, loading: expensesLoading, error: expensesError, fetchExpenses, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { showExpenseForm, actionSelect, editingExpense, closeExpenseForm, openEditExpense, handleActionChange } = useExpenseForm();
  const { filters, handleFilterChange } = useExpenseFilters();
  const { categories, loading: categoriesLoading, error: categoriesError, fetchCategories, createCategory } = useCategories();
  const { rules, pagination, loading: rulesLoading, error: rulesError, fetchRules, createRule, deleteRule, createRuleFromTransaction } = useRules();
  
  // Analytics Hook & Independent Filter State
  const { summaryData, loading: analyticsLoading, error: analyticsError, fetchSummary } = useExpenseAnalytics();
  const [chartFilters, setChartFilters] = useState({
    group_by: 'month',
    start_date: '2026-01-01', 
    end_date: '2026-12-31',
    account_id: ''
  });

  const [showAccountForm, setShowAccountForm] = useState(false);

  // 1. Single Source of Truth for Ledger data fetching - reacts automatically to filter changes
  useEffect(() => {
    // Optimization: strip out any blank strings before sending parameters over the network
    const cleanParams = Object.fromEntries(
      Object.entries(filters).filter(([_, val]) => val !== '' && val !== null)
    );
    fetchExpenses(cleanParams);
  }, [fetchExpenses, filters]);

  // 2. Reacts automatically to Chart specific filter changes
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

  // Helper function to keep chart aggregates sync'd if database modifications occur
  const triggerGlobalRefresh = async () => {
    await fetchExpenses(filters);
    await fetchSummary(chartFilters);
  };

  // Optimized update handler used exclusively by inline actions or manual creations
  const handleSaveExpense = async (payload) => {
    try {
      await updateExpense(payload.id, payload);
      await triggerGlobalRefresh(); 
    } catch (err) {
      console.error('Failed updating record', err);
    }
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
      <section className="sectionCard">
        <div className="headingRow" style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Transaction Ledger</h3>
          <div className="actionsRow">
            <select value={actionSelect} onChange={(e) => handleActionChange(e.target.value)} className="inlineButton">
              <option value="none">Actions</option>
              <option value="add_manual">Add Manual Transaction</option>
            </select>
            {showExpenseForm && (
              <button type="button" onClick={closeExpenseForm} className="inlineButton">
                Close
              </button>
            )}
          </div>
        </div>

        <LedgerFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          accountNameMap={accountNameMap}
          categories={categories}
        />

        {showExpenseForm && (
          <div className="formPanel">
            <ExpenseForm
              categories={categories}       
              accountNameMap={accountNameMap} 
              initialData={null} 
              onExpenseAdded={async (data) => {
                await createExpense(data);
                await triggerGlobalRefresh(); 
                closeExpenseForm();
              }}
              onCancel={closeExpenseForm}
            />
          </div>
        )}

        {expensesError && <p className="errorText">Error loading ledger data: {expensesError.message}</p>}
        
        {expensesLoading ? (
          <p>Loading ledger records...</p>
        ) : (
          <LedgerTable
            expenses={expenses}
            accountNameMap={accountNameMap}
            categories={categories}
            onExpenseSaved={handleSaveExpense}
            onDelete={async (id) => {
              await deleteExpense(id);
              await triggerGlobalRefresh(); 
            }}
            onCreateRuleFromTransaction={createRuleFromTransaction}
            onBulkUpdateSuccess={triggerGlobalRefresh}
          />
        )}
      </section>

      <Footer />
    </div>
  );
}

export default App;