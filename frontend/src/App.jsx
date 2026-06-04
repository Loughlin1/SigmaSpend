// src/App.jsx
import './App.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { expenseApi, ingestionApi } from './api/client';
import DescriptionSection from './components/Description';
import ExpenseForm from './components/ExpenseForm';
import StatementUpload from './components/StatementUpload';
import ExpenseChart from './components/ExpenseChart';
import BankAccountList from './components/BankAccountList';
import BankAccountForm from './components/BankAccountForm';


function App() {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [actionSelect, setActionSelect] = useState('none');
  const [editingExpense, setEditingExpense] = useState(null);

  const accountNameMap = useMemo(
    () =>
      accounts.reduce((map, account) => {
        map[account.account_id] = account.account_name;
        return map;
      }, {}),
    [accounts]
  );

  const fetchExpenses = useCallback(async () => {
    try {
      const data = await expenseApi.getAll({ limit: 100 });
      setExpenses(data);
    } catch (err) {
      console.error('Failed fetching ledger data', err);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);

    try {
      const data = await ingestionApi.getAccounts({ active_only: true });
      setAccounts(data);
      setAccountsError('');
    } catch (err) {
      console.error('Failed fetching bank accounts', err);
      setAccountsError('Unable to load bank accounts at this time.');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, [fetchExpenses, fetchAccounts]);

  const handleCreateExpense = async (newExpense) => {
    try {
      await expenseApi.create(newExpense);
      await fetchExpenses();
    } catch (err) {
      console.error('Failed creating record', err);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await expenseApi.delete(id);
      await fetchExpenses();
    } catch (err) {
      console.error('Failed deleting record', err);
    }
  };

  const handleAccountCreated = async () => {
    await fetchAccounts();
    setShowAccountForm(false);
  };

  const closeExpenseForm = () => {
    setEditingExpense(null);
    setShowExpenseForm(false);
    setActionSelect('none');
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
    setActionSelect('none');
  };

  const handleActionChange = (value) => {
    setActionSelect(value);
    setShowExpenseForm(value === 'add_manual');
    if (value !== 'add_manual') {
      setEditingExpense(null);
    }
  };

  const handleSaveExpense = async (payload) => {
    try {
      await expenseApi.update(payload.id, payload);
      await fetchExpenses();
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
              onExpenseAdded={(data) => {
                handleCreateExpense(data);
                closeExpenseForm();
              }}
              onExpenseSaved={handleSaveExpense}
              onCancel={closeExpenseForm}
            />
          </div>
        )}

        <table border="1" cellPadding="10" className="table">
          <thead className="tableHeader">
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Account</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td>{exp.date}</td>
                <td>{exp.description}</td>
                <td>{accountNameMap[exp.account_id] || exp.account_id}</td>
                <td>{exp.category}</td>
                <td>{exp.is_income ? 'Income' : 'Expense'}</td>
                <td>£{Number(exp.amount).toFixed(2)}</td>
                <td>
                  <button type="button" onClick={() => handleEditExpense(exp)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDeleteExpense(exp.id)} style={{ marginLeft: '0.5rem' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;
