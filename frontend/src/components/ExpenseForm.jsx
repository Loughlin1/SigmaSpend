// src/components/ExpenseForm.jsx
import React, { useState } from 'react';

export default function ExpenseForm({ onExpenseAdded }) {
  const [formData, setFormData] = useState({
    amount: '',
    is_income: false,
    category: 'Uncategorized',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    onExpenseAdded(payload);
    // Reset form field values here...
  };

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <h3>Add Manual Transaction</h3>
      <input 
        type="text" 
        placeholder="Description" 
        value={formData.description} 
        onChange={e => setFormData({...formData, description: e.target.value})} 
        required 
      />
      <input 
        type="number" 
        step="0.01" 
        placeholder="Amount" 
        value={formData.amount} 
        onChange={e => setFormData({...formData, amount: e.target.value})} 
        required 
      />
      <select 
        value={formData.is_income} 
        onChange={e => setFormData({...formData, is_income: e.target.value === 'true'})}
      >
        <option value="false">Expense</option>
        <option value="true">Income</option>
      </select>
      <input 
        type="date" 
        value={formData.date} 
        onChange={e => setFormData({...formData, date: e.target.value})} 
      />
      <button type="submit">Save Transaction</button>
    </form>
  );
}