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

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, []);

  return (
    <div className="app-container" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Σ SigmaSpend Dashboard</h1>
      <hr />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <StatementUpload accounts={accounts} onUploadSuccess={fetchExpenses} />
          <ExpenseForm onExpenseAdded={handleCreateExpense} />
        </div>
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <BankAccountForm onAccountCreated={fetchAccounts} />
          <BankAccountList accounts={accounts} loading={accountsLoading} error={accountsError} />
        </div>
      </div>

      <ExpenseChart expenses={expenses} />

      <h3>Transaction Ledger</h3>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
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
              <td>{exp.category}</td>
              <td>{exp.is_income ? 'Income' : 'Expense'}</td>
              <td>£{exp.amount.toFixed(2)}</td>
              <td>
                <button onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;