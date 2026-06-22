// src/components/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';

export default function ExpenseForm({ 
  categories = [], 
  accountNameMap = {}, 
  onExpenseAdded, 
  initialData = null, 
  onExpenseSaved, 
  onCancel 
}) {
  const [formData, setFormData] = useState({
    amount: '',
    is_income: false,
    category: 'Uncategorized',
    description: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '' 
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount != null ? String(initialData.amount) : '',
        is_income: !!initialData.is_income,
        category: initialData.category || 'Uncategorized',
        description: initialData.description || '',
        date: initialData.date || new Date().toISOString().split('T')[0],
        account_id: initialData.account_id || ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.account_id) {
      alert("Please select a bank account.");
      return;
    }
    
    const payload = { ...formData, amount: parseFloat(formData.amount) };
    if (initialData && initialData.id && typeof onExpenseSaved === 'function') {
      onExpenseSaved({ id: initialData.id, ...payload });
    } else if (typeof onExpenseAdded === 'function') {
      onExpenseAdded(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h3>{initialData ? 'Edit Transaction' : 'Add Manual Transaction'}</h3>

      <div className="form__grid">
        <input
          type="text"
          placeholder="Description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          required
          className='form-inline-input'    
        />

        <select 
          value={formData.category} 
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          className='form-inline-input'
        >
          <option value="Uncategorized">❓ Uncategorized</option>
          {categories.map(cat => (
            <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
              <option value={cat.name}>{cat.icon || '📁'} {cat.name} (All)</option>
              {cat.subcategories?.map(sub => (
                <option key={sub.id} value={sub.name}>🔹 {sub.name}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={formData.account_id}
          onChange={e => setFormData({ ...formData, account_id: e.target.value })}
          required
          className='form-inline-input'
        >
          <option value="">Select Target Account</option>
          {Object.entries(accountNameMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={formData.amount}
          onChange={e => setFormData({ ...formData, amount: e.target.value })}
          required
          className='form-inline-input'
        />

        <select
          value={formData.is_income}
          onChange={e => setFormData({ ...formData, is_income: e.target.value === 'true' })}
          className='form-inline-input'
        >
          <option value="false">Expense</option>
          <option value="true">Income</option>
        </select>

        <input
          type="date"
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
          className='form-inline-input'
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', width: '100%', marginTop: '1.25rem' }}>
        <button type="button" onClick={onCancel} className='form__cancel'>Cancel</button>
        <button type="submit" className='form__submit' style={{ background: '#3182ce', color: 'white' }}>Save Transaction</button>
      </div>
    </form>
  );
}