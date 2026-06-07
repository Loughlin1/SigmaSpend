// src/App.jsx
import './App.css';
import React, { useState, useEffect } from 'react';
import logo from './assets/logo.png';
import DescriptionSection from './components/Description';
import ExpenseForm from './components/ExpenseForm';
import StatementUpload from './components/StatementUpload';
import ExpenseChart from './components/ExpenseChart';
import BankAccountList from './components/BankAccountList';
import LedgerTable from './components/LedgerTable';
import LedgerFilters from './components/LedgerFilters';
import CategoryManager from './components/CategoryManager';

// Custom Hooks
import useExpenses from './hooks/useExpenses';
import useAccounts from './hooks/useAccounts';
import useExpenseForm from './hooks/useExpenseForm';
import useExpenseFilters from './hooks/useExpenseFilters';
import useCategories from './hooks/useCategories';

function App() {
  const { expenses, loading: expensesLoading, error: expensesError, fetchExpenses, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { showExpenseForm, actionSelect, editingExpense, closeExpenseForm, openEditExpense, handleActionChange } = useExpenseForm();
  const { filters, handleFilterChange } = useExpenseFilters();
  const { categories, loading: categoriesLoading, error: categoriesError, fetchCategories, createCategory } = useCategories();
  const [showAccountForm, setShowAccountForm] = useState(false);

  // 1. Single Source of Truth for Ledger data fetching - reacts automatically to filter changes
  useEffect(() => {
    fetchExpenses(filters);
  }, [fetchExpenses, filters]);

  // 2. Fetch Accounts on initial mount
  useEffect(() => {
    fetchAccounts();
    fetchCategories();
  }, [fetchAccounts, fetchCategories]);

  const handleAccountCreated = async () => {
    await fetchAccounts();
    setShowAccountForm(false);
  };

  const handleSaveExpense = async (payload) => {
    try {
      await updateExpense(payload.id, payload);
      await fetchExpenses(filters); // Refresh current filter views
    } catch (err) {
      console.error('Failed updating record', err);
    } finally {
      closeExpenseForm();
    }
  };

  return (
    <div className="page">
      <div className="logo-container">
        <img src={logo} alt="SigmaSpend Logo" width="64" className="logo"/>
        <h1>SigmaSpend Dashboard</h1>
      </div>
      <hr />

      <div className="splitSection">
        <DescriptionSection />
        <StatementUpload accounts={accounts} onUploadSuccess={() => fetchExpenses(filters)} />
      </div>

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

      <div style={{ marginBottom: '5rem' }}>
        <ExpenseChart expenses={expenses} accounts={accounts} />
      </div>

      <section style={{ marginBottom: '1rem' }}>
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
        />

        {showExpenseForm && (
          <div className="formPanel">
            <ExpenseForm
              categories={categories}       // Pass down categories hook data
              accountNameMap={accountNameMap} // Pass down accounts map data
              initialData={editingExpense}
              onExpenseAdded={async (data) => {
                await createExpense(data);
                await fetchExpenses(filters);
                closeExpenseForm();
              }}
              onExpenseSaved={handleSaveExpense}
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
            onEdit={openEditExpense}
            onDelete={async (id) => {
              await deleteExpense(id);
              await fetchExpenses(filters);
            }}
          />
        )}
      </section>
    </div>
  );
}

export default App;