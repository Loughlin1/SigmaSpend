// src/components/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';

export default function ExpenseForm({ onExpenseAdded, initialData = null, onExpenseSaved, onCancel }) {
  const [formData, setFormData] = useState({
    amount: '',
    is_income: false,
    category: 'Uncategorized',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount != null ? String(initialData.amount) : '',
        is_income: !!initialData.is_income,
        category: initialData.category || 'Uncategorized',
        description: initialData.description || '',
        date: initialData.date || new Date().toISOString().split('T')[0]
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    if (initialData && initialData.id && typeof onExpenseSaved === 'function') {
      onExpenseSaved({ id: initialData.id, ...payload });
    } else if (typeof onExpenseAdded === 'function') {
      onExpenseAdded(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <h3>{initialData ? 'Edit Transaction' : 'Add Manual Transaction'}</h3>
      <input
        type="text"
        placeholder="Description"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        required
      />
      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={formData.amount}
        onChange={e => setFormData({ ...formData, amount: e.target.value })}
        required
      />
      <select
        value={formData.is_income}
        onChange={e => setFormData({ ...formData, is_income: e.target.value === 'true' })}
      >
        <option value="false">Expense</option>
        <option value="true">Income</option>
      </select>
      <input
        type="date"
        value={formData.date}
        onChange={e => setFormData({ ...formData, date: e.target.value })}
      />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="submit">Save Transaction</button>
        {initialData && typeof onCancel === 'function' && (
          <button type="button" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}