// src/App.jsx
import React, { useState, useEffect } from 'react';
import { expenseApi, ingestionApi } from './api/client';
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

  const accountNameMap = accounts.reduce((map, account) => {
    map[account.account_id] = account.account_name;
    return map;
  }, {});

  const fetchExpenses = async () => {
    try {
      const data = await expenseApi.getAll({ limit: 100 });
      setExpenses(data);
    } catch (err) {
      console.error("Failed fetching ledger data", err);
    }
  };

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const data = await ingestionApi.getAccounts({ active_only: true });
      setAccounts(data);
      setAccountsError('');
    } catch (err) {
      console.error("Failed fetching bank accounts", err);
      setAccountsError('Unable to load bank accounts at this time.');
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleCreateExpense = async (newExpense) => {
    try {
      await expenseApi.create(newExpense);
      fetchExpenses(); // Refresh state view
    } catch (err) {
      console.error("Failed creating record", err);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await expenseApi.delete(id);
      fetchExpenses();
    } catch (err) {
      console.error("Failed deleting record", err);
    }
  };

  const handleAccountCreated = async () => {
    await fetchAccounts();
    setShowAccountForm(false);
  };

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, []);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [actionSelect, setActionSelect] = useState('none');
  const [editingExpense, setEditingExpense] = useState(null);

  return (
    <div className="app-container" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Σ SigmaSpend Dashboard</h1>
      <hr />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <StatementUpload accounts={accounts} onUploadSuccess={fetchExpenses} />
            </div>
            <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Bank Accounts</h3>
                <button
                  onClick={() => setShowAccountForm((prev) => !prev)}
                  style={{ padding: '0.75rem 1rem' }}
                >
                  {showAccountForm ? 'Hide Form' : 'Create New Bank Account'}
                </button>
              </div>

              {showAccountForm && (
                <BankAccountForm onAccountCreated={handleAccountCreated} />
              )}

              <BankAccountList accounts={accounts} loading={accountsLoading} error={accountsError} />
            </div>
          </div>

          <div style={{ marginBottom: '5rem' }}>
            <ExpenseChart expenses={expenses} accounts={accounts} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <h3 style={{ margin: 0 }}>Transaction Ledger</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={actionSelect}
                onChange={(e) => {
                  setActionSelect(e.target.value);
                  setShowExpenseForm(e.target.value === 'add_manual');
                }}
                style={{ padding: '0.5rem' }}
              >
                <option value="none">Actions</option>
                <option value="add_manual">Add Manual Transaction</option>
              </select>
              {showExpenseForm && (
                <button onClick={() => { setShowExpenseForm(false); setActionSelect('none'); }} style={{ padding: '0.5rem' }}>
                  Close
                </button>
              )}
            </div>
          </div>

          {showExpenseForm && (
            <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ddd', borderRadius: '6px', background: '#fafafa' }}>
              <ExpenseForm
                initialData={editingExpense}
                onExpenseAdded={(data) => { handleCreateExpense(data); setShowExpenseForm(false); setActionSelect('none'); }}
                onExpenseSaved={async (payload) => {
                  try {
                    await expenseApi.update(payload.id, payload);
                    fetchExpenses();
                  } catch (err) {
                    console.error('Failed updating record', err);
                  } finally {
                    setEditingExpense(null);
                    setShowExpenseForm(false);
                    setActionSelect('none');
                  }
                }}
                onCancel={() => { setEditingExpense(null); setShowExpenseForm(false); setActionSelect('none'); }}
              />
            </div>
          )}

          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
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
                  <td>£{exp.amount.toFixed(2)}</td>
                  <td>
                    <button onClick={() => { setEditingExpense(exp); setShowExpenseForm(true); setActionSelect('none'); }}>Edit</button>
                    <button onClick={() => handleDeleteExpense(exp.id)} style={{ marginLeft: '0.5rem' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
    </div>
  );
}

export default App;