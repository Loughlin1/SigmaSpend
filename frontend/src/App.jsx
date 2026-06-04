// src/App.jsx
import './App.css';
import React, { useState, useEffect, useMemo } from 'react';
import { ingestionApi } from './api/client';
import DescriptionSection from './components/Description';
import ExpenseForm from './components/ExpenseForm';
import StatementUpload from './components/StatementUpload';
import ExpenseChart from './components/ExpenseChart';
import BankAccountList from './components/BankAccountList';
import BankAccountForm from './components/BankAccountForm';
import useExpenses from './hooks/useExpenses';
import useAccounts from './hooks/useAccounts';
import useExpenseForm from './hooks/useExpenseForm';
import LedgerTable from './components/LedgerTable';


function App() {
  const { expenses, fetchExpenses, createExpense, updateExpense, deleteExpense } = useExpenses();
  const { accounts, loading: accountsLoading, error: accountsError, fetchAccounts, accountNameMap } = useAccounts();
  const { showExpenseForm, actionSelect, editingExpense, closeExpenseForm, openEditExpense, handleActionChange } =
    useExpenseForm();
  const [showAccountForm, setShowAccountForm] = useState(false);

  // accountNameMap provided by useAccounts

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, [fetchExpenses, fetchAccounts]);

  // expense CRUD delegated to `useExpenses` hook: createExpense, updateExpense, deleteExpense

  const handleAccountCreated = async () => {
    await fetchAccounts();
    setShowAccountForm(false);
  };

  // expense form state/hooks provided by useExpenseForm
  const handleEditExpense = (expense) => openEditExpense(expense);

  const handleSaveExpense = async (payload) => {
    try {
      await updateExpense(payload.id, payload);
    } catch (err) {
      console.error('Failed updating record', err);
    } finally {
      closeExpenseForm();
    }
  };

  return (
    <div className="page">
      <h1>Σ SigmaSpend Dashboard</h1>
      <hr />

      <div className="splitSection">
        <DescriptionSection />
        <StatementUpload accounts={accounts} onUploadSuccess={fetchExpenses} />
      </div>

      <div className="gridTwoColumns">
        <section className="sectionCard">
          <div className="headingRow">
            <h3 style={{ margin: 0 }}>Bank Accounts</h3>
            <button type="button" onClick={() => setShowAccountForm((prev) => !prev)} className="button">
              {showAccountForm ? 'Hide Form' : 'Create New Bank Account'}
            </button>
          </div>

          {showAccountForm && <BankAccountForm onAccountCreated={handleAccountCreated} />}

          <BankAccountList
            accounts={accounts}
            loading={accountsLoading}
            error={accountsError}
            onAccountUpdated={fetchAccounts}
          />
        </section>
      </div>

      <div style={{ marginBottom: '5rem' }}>
        <ExpenseChart expenses={expenses} accounts={accounts} />
      </div>

      <section style={{ marginBottom: '1rem' }}>
        <div className="headingRow">
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

        {showExpenseForm && (
          <div className="formPanel">
            <ExpenseForm
              initialData={editingExpense}
              onExpenseAdded={async (data) => {
                await createExpense(data);
                closeExpenseForm();
              }}
              onExpenseSaved={handleSaveExpense}
              onCancel={closeExpenseForm}
            />
          </div>
        )}

        <LedgerTable
          expenses={expenses}
          accountNameMap={accountNameMap}
          onEdit={handleEditExpense}
          onDelete={async (id) => {
            await deleteExpense(id);
          }}
        />
      </section>
    </div>
  );
}

export default App;
