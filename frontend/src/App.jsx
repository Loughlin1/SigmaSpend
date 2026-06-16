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

// Custom Hooks
import useExpenses from './hooks/useExpenses';
import useAccounts from './hooks/useAccounts';
import useExpenseForm from './hooks/useExpenseForm';
import useExpenseFilters from './hooks/useExpenseFilters';
import useCategories from './hooks/useCategories';
import useRules from './hooks/useRules';

function App() {
  const { expenses, loading: expensesLoading, error: expensesError, fetchExpenses, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { showExpenseForm, actionSelect, editingExpense, closeExpenseForm, openEditExpense, handleActionChange } = useExpenseForm();
  const { filters, handleFilterChange } = useExpenseFilters();
  const { categories, loading: categoriesLoading, error: categoriesError, fetchCategories, createCategory } = useCategories();
  const { rules, loading: rulesLoading, error: rulesError, fetchRules, createRule, deleteRule, createRuleFromTransaction } = useRules();

  const [showAccountForm, setShowAccountForm] = useState(false);

  // 1. Single Source of Truth for Ledger data fetching - reacts automatically to filter changes
  useEffect(() => {
    fetchExpenses(filters);
  }, [fetchExpenses, filters]);

  // 2. Fetch Accounts, Categories, and Rules on initial mount
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
    fetchRules();
  }, [fetchAccounts, fetchCategories, fetchRules]);

  const handleAccountCreated = async () => {
    await fetchAccounts();
    setShowAccountForm(false);
  };

  // 3. Optimized update handler used exclusively by inline actions or manual creations
  const handleSaveExpense = async (payload) => {
    try {
      await updateExpense(payload.id, payload);
      await fetchExpenses(filters); // Refresh current filter views instantly
    } catch (err) {
      console.error('Failed updating record', err);
    }
  };

  const handleCreateRule = async (ruleData) => {
    await createRule(ruleData);
    await fetchRules(); // Pull fresh data instantly
  };

  const handleDeleteRule = async (ruleId) => {
    await deleteRule(ruleId);
    await fetchRules(); // Pull fresh data instantly
  };

  return (
    <div className="page">
      <Header />

      <section className="sectionCard">
        <div className="splitSection">
          <DescriptionSection />
          {/* Synchronize state completely following file intake rules */}
          <StatementUpload 
            accounts={accounts} 
            onUploadSuccess={() => { fetchExpenses(filters); fetchRules(); }} 
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
          categories={categories}
          onCreateRule={handleCreateRule}
          onDeleteRule={handleDeleteRule}
          loading={rulesLoading}
          error={rulesError}
        />
      </section>

      <section className="sectionCard">
        <ExpenseChart expenses={expenses} accounts={accounts} />
      </section>

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

        {/* Dynamic Filter Controls */}
        <LedgerFilters 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          accountNameMap={accountNameMap}
          categories={categories}
        />

        {/* ExpenseForm remains here ONLY for creating clean manual transactions */}
        {showExpenseForm && (
          <div className="formPanel">
            <ExpenseForm
              categories={categories}       
              accountNameMap={accountNameMap} 
              initialData={null} // Enforces form is blank for fresh manual creation entries
              onExpenseAdded={async (data) => {
                await createExpense(data);
                await fetchExpenses(filters);
                closeExpenseForm();
              }}
              onCancel={closeExpenseForm}
            />
          </div>
        )}

        {/* Error and Loading states for structural UX */}
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
              await fetchExpenses(filters);
            }}
            onCreateRuleFromTransaction={createRuleFromTransaction}
          />
        )}
      </section>

      <Footer />
    </div>
  );
}

export default App;