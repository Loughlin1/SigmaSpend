// src/components/ExpenseForm.jsx
import React, { useState, useEffect } from 'react';

// Added categories and accountNameMap to the destructured props
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
    account_id: '' // Added since it is required by your Pydantic/Database schema
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
    <form onSubmit={handleSubmit} className="expense-form">
      <h3>{initialData ? 'Edit Transaction' : 'Add Manual Transaction'}</h3>
      <div style={{display: 'flex', flexDirection: 'column'}}>
        <div style={{display: 'flex',  gap: '0.25rem'}}>
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            required
            className='inlineButton'    
          />

          {/* Dynamic Categories Selector */}
          <select 
            value={formData.category} 
            onChange={e => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Uncategorized">❓ Uncategorized</option>
            {categories.map(cat => (
              /* Include the parent icon in the optgroup label */
              <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
                <option value={cat.name}>{cat.icon || '📁'} {cat.name} (All)</option>
                {cat.subcategories?.map(sub => (
                  /* Subcategories can have default folder/bullet styling */
                  <option key={sub.id} value={sub.name}>🔹 {sub.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Dynamic Bank Account Selector (Required to avoid backend schema errors) */}
          <select
            value={formData.account_id}
            onChange={e => setFormData({ ...formData, account_id: e.target.value })}
            required
            className='inlineButton'
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
            className='inlineButton'
          />

          <select
            value={formData.is_income}
            onChange={e => setFormData({ ...formData, is_income: e.target.value === 'true' })}
            className='inlineButton'
          >
            <option value="false">Expense</option>
            <option value="true">Income</option>
          </select>

          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className='inlineButton'
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onCancel} className='inlineButton'>Cancel</button>
          <button type="submit" className='inlineButton'>Save Transaction</button>
        </div>
      </div>
    </form>
  );
}