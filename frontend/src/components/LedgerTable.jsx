// src/components/LedgerTable.jsx
import React, { useState } from 'react';
import '../styles/lists.css';
import '../styles/forms.css';

export default function LedgerTable({ 
  expenses = [], 
  accountNameMap = {}, 
  categories = [], 
  onExpenseSaved, // Maps straight to handleSaveExpense
  onDelete 
}) {
  // Track which row primary key is currently being actively edited inline
  const [editingId, setEditingId] = useState(null);
  
  // Local state mirror for the single transaction record being altered
  const [editFormData, setEditFormData] = useState({
    id: '',
    date: '',
    description: '',
    account_id: '',
    category: '',
    notes: '',
    is_income: false,
    amount: ''
  });

  const getCategoryIcon = (categoryName) => {
    const match = categories.find(c => c.name === categoryName);
    if (match) return match.icon;

    // If it's a subcategory, scan through parent groups and return the parent's icon
    for (let cat of categories) {
      // Look for string matching values inside the current category schema
      if (cat.subcategories?.some(s => typeof s === 'string' ? s === categoryName : s.name === categoryName)) {
        return cat.icon || '📁'; // Returns parent icon (e.g. 🍽️ for Food & Drink subcategories)
      }
    }
    return '❓'; // Fallback icon if completely uncategorized
  };

  // Turn on editing for a row and snapshot its baseline state values
  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditFormData({
      id: exp.id,
      // Handle potential date-reformatting layers safely if your raw API sends back UK strings
      date: exp.date && exp.date.includes('/') 
        ? exp.date.split('/').reverse().join('-') 
        : exp.date || '',
      description: exp.description || '',
      account_id: exp.account_id || '',
      category: exp.category || 'Uncategorized',
      notes: exp.notes || '',
      is_income: !!exp.is_income,
      amount: exp.amount != null ? String(exp.amount) : ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleInlineSave = async (e) => {
    e.preventDefault();
    if (!editFormData.account_id) {
      alert("Please select a bank account.");
      return;
    }

    // Parse values to align with Pydantic type signatures before API triggers
    const payload = {
      id: editFormData.id,
      amount: parseFloat(editFormData.amount),
      is_income: editFormData.is_income,
      category: editFormData.category,
      description: editFormData.description,
      date: editFormData.date,
      account_id: editFormData.account_id,
      notes: editFormData.notes
    };

    if (typeof onExpenseSaved === 'function') {
      await onExpenseSaved(payload);
    }
    setEditingId(null); // Return row to pristine read-only state
  };

  return (
    <table border="1" cellPadding="10" className="table ledger-table-view" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th style={{ width: '8%' }}>Date</th>
          <th style={{ width: '20%' }}>Description</th>
          <th style={{ width: '8%' }}>Account</th>
          <th style={{ width: '15%' }}>Category</th>
          <th style={{ width: '15%' }}>Notes</th>
          <th style={{ width: '10%' }}>Type</th>
          <th style={{ width: '10%' }}>Amount</th>
          <th style={{ width: '11%', textAlign: 'center' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((exp) => {
          const isCurrentRowEditing = editingId === exp.id;

          if (isCurrentRowEditing) {
            return (
              <tr key={exp.id} style={{ background: '#f7fafc' }}>
                <td>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={editFormData.description}
                    onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                    required
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                  />
                </td>
                <td>
                  <select
                    value={editFormData.account_id}
                    onChange={e => setEditFormData({ ...editFormData, account_id: e.target.value })}
                    required
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                  >
                    <option value="">Select Account</option>
                    {Object.entries(accountNameMap).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select 
                    value={editFormData.category} 
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem' }}
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
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Notes..."
                    value={editFormData.notes}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                  />
                </td>
                <td>
                  <select
                    value={editFormData.is_income}
                    onChange={e => setEditFormData({ ...editFormData, is_income: e.target.value === 'true' })}
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                  >
                    <option value="false">Expense</option>
                    <option value="true">Income</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                    required
                    className="form-inline-input"
                    style={{ padding: '0.25rem', fontSize: '0.85rem', fontWeight: '500' }}
                  />
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button type="button" onClick={handleInlineSave} className="inlineButton" style={{ background: '#f0fff4', color: '#22543d', borderColor: '#c6f6d5' }}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className="inlineButton">
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            );
          }

          // Read-Only pristine view row layout
          return (
            <tr key={exp.id}>
              <td className="ledger-table-date">{exp.date}</td>
              <td>{exp.description}</td>
              <td>{accountNameMap[exp.account_id] || exp.account_id}</td>
              <td>{getCategoryIcon(exp.category)} {exp.category}</td>
              <td>{exp.notes || <span style={{ color: '#ccc' }}>—</span>}</td>
              <td>{exp.is_income ? 'Income' : 'Expense'}</td>
              <td className="ledger-table-amount" style={{ color: exp.is_income ? '#22543d' : '#2d3748' }}>
                £{Number(exp.amount).toFixed(2)}
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                  <button type="button" onClick={() => startEdit(exp)} className="inlineButton">
                    Edit
                  </button>
                  <button 
                    type="button" 
                    onClick={() => onDelete && onDelete(exp.id)} 
                    className="inlineButton"
                    style={{ background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}