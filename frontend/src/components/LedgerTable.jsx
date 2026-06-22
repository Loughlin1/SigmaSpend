// src/components/LedgerTable.jsx
import React, { useState } from 'react';
import { expenseApi } from '../api/client';
import '../styles/lists.css';
import '../styles/forms.css';

export default function LedgerTable({ 
  expenses = [], 
  accountNameMap = {}, 
  categories = [], 
  onExpenseSaved, 
  onDelete,
  onCreateRuleFromTransaction,
  onBulkUpdateSuccess 
}) {
  const [editingId, setEditingId] = useState(null);
  const [ruleTargetField, setRuleTargetField] = useState("");
  const [editFormData, setEditFormData] = useState({
    id: '', date: '', description: '', account_id: '', category_id: '', notes: '', is_income: false, amount: ''
  });

  // Tracking State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // --- Checkbox Selection Handlers ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(expenses.map(exp => exp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const catId = bulkCategory === "" ? null : parseInt(bulkCategory, 10);
      await expenseApi.bulkClassify(selectedIds, catId);
      
      alert(`Successfully classified ${selectedIds.length} transactions!`);
      setSelectedIds([]); 
      setBulkCategory("");
      
      if (typeof onBulkUpdateSuccess === 'function') {
        onBulkUpdateSuccess(); 
      }
            
    } catch (err) {
      console.error("[SigmaSpend UI] Bulk classification execution thread halted:", err);
      alert("Failed to apply bulk classifications.");
    } finally {
      setBulkUpdating(false);
    }
  };

  // --- Row Saving Handler ---
  const handleRowSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    try {
      const payload = {
        id: editFormData.id,
        amount: parseFloat(editFormData.amount),
        is_income: editFormData.is_income,
        category_id: editFormData.category_id ? parseInt(editFormData.category_id, 10) : null,
        description: editFormData.description,
        date: editFormData.date,
        account_id: editFormData.account_id,
        notes: editFormData.notes
      };

      if (ruleTargetField !== "" && editFormData.category_id !== "") {
        if (typeof onCreateRuleFromTransaction === 'function') {
          const ruleKeyword = ruleTargetField === 'description' 
            ? editFormData.description 
            : editFormData.notes;

          try {
            await onCreateRuleFromTransaction({
              keyword: ruleKeyword,
              match_field: ruleTargetField,
              category_id: payload.category_id
            });
          } catch (ruleErr) {
            const errorMsg = ruleErr.response?.data?.detail || "Rule criteria validation failed.";
            alert(`⚠️ Transaction saved, but Rule Creation Failed:\n${errorMsg}`);
          }
        }
      }

      if (typeof onExpenseSaved === 'function') {
        await onExpenseSaved(payload);
      }

      setEditingId(null);
      setRuleTargetField(""); 
      
    } catch (err) {
      console.error("[SigmaSpend UI] Network thread halted inside handleRowSave:", err);
      alert("Could not save transaction changes. Please verify network connections.");
    }
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setEditFormData({
      id: exp.id,
      date: exp.date && exp.date.includes('/') ? exp.date.split('/').reverse().join('-') : exp.date || '',
      description: exp.description || '',
      account_id: exp.account_id || '',
      category_id: exp.category_id != null ? String(exp.category_id) : '',
      notes: exp.notes || '',
      is_income: !!exp.is_income,
      amount: exp.amount != null ? String(exp.amount) : ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRuleTargetField(""); 
  };

  const getCategoryDisplay = (categoryId) => {
    if (!categoryId) return { icon: '❓', name: 'Uncategorized' };

    for (let cat of categories) {
      if (cat.id === categoryId) {
        return { icon: cat.icon || '📁', name: cat.name };
      }
      const subMatch = cat.subcategories?.find(s => s.id === categoryId);
      if (subMatch) {
        return { icon: cat.icon || '📁', name: subMatch.name };
      }
    }
    return { icon: '❓', name: 'Uncategorized' };
  };

  const getAccountAbbreviation = (accountName) => {
    if (!accountName) return '';
    return accountName
      .replace(/current account/i, 'CA')
      .replace(/credit card/i, 'CC')
      .trim();
  };

  return (
    <div className="ledger-table-container" style={{ position: 'relative' }}>
      
      {/* Floating Sticky Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'sticky', top: '10px', zIndex: 10, display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          background: '#ebf8ff', border: '1px solid #bee3f8', padding: '0.75rem 1rem',
          borderRadius: '6px', marginBottom: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#2b6cb0', fontWeight: '500' }}>
            Selected <strong>{selectedIds.length}</strong> transactions
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select 
              value={bulkCategory} 
              onChange={e => setBulkCategory(e.target.value)}
              className="form-inline-input"
              style={{ margin: 0, padding: '0.35rem', width: '200px', fontSize: '0.85rem' }}
              disabled={bulkUpdating}
            >
              <option value="">❓ Move to Uncategorized</option>
              {categories.map(cat => (
                <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
                  <option value={cat.id}>{cat.name} (All)</option>
                  {cat.subcategories?.map(sub => (
                    <option key={sub.id} value={sub.id}>🔹 {sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button 
              onClick={handleBulkSubmit}
              className="inlineButton"
              style={{ background: '#3182ce', color: 'white', padding: '0.35rem 1rem' }}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? 'Updating...' : 'Apply Category'}
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="inlineButton" 
              style={{ padding: '0.35rem 0.75rem' }}
              disabled={bulkUpdating}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <table border="1" cellPadding="10" className="table ledger-table-view" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '4%', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                onChange={handleSelectAll}
                checked={expenses.length > 0 && selectedIds.length === expenses.length}
              />
            </th>
            <th style={{ width: '10%' }}>Date</th>
            <th style={{ width: '21%' }}>Description</th>
            <th style={{ width: '10%' }}>Account</th>
            <th style={{ width: '15%' }}>Category</th>
            <th style={{ width: '15%' }}>Notes</th>
            <th style={{ width: '8%' }}>Type</th>
            <th style={{ width: '12%' }}>Amount</th>
            <th style={{ width: '5%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => {
            const isCurrentRowEditing = editingId === exp.id;
            const isChecked = selectedIds.includes(exp.id);
            const displayCategory = getCategoryDisplay(exp.category_id);
            const displayAccountName = getAccountAbbreviation(accountNameMap[exp.account_id] || exp.account_id);

            if (isCurrentRowEditing) {
              return (
                <tr key={exp.id} style={{ background: '#f7fafc' }}>
                  <td></td>
                  <td>
                    <input type="date" value={editFormData.date} className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                      onChange={e => setEditFormData({ ...editFormData, date: e.target.value })} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <input type="text" value={editFormData.description} required className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                        onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#2b6cb0', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={ruleTargetField === 'description'} 
                          onChange={(e) => setRuleTargetField(e.target.checked ? 'description' : '')} 
                        />
                        ⚡ Learn from description text
                      </label>
                    </div>
                  </td>
                  <td>
                    <select value={editFormData.account_id} required className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                      onChange={e => setEditFormData({ ...editFormData, account_id: e.target.value })} >
                      <option value="">Select Account</option>
                      {Object.entries(accountNameMap).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select value={editFormData.category_id} className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                      onChange={e => setEditFormData({ ...editFormData, category_id: e.target.value })} >
                      <option value="">❓ Uncategorized</option>
                      {categories.map(cat => (
                        <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
                          <option value={cat.id}>{cat.icon || '📁'} {cat.name} (All)</option>
                          {cat.subcategories?.map(sub => (
                            <option key={sub.id} value={sub.id}>🔹 {sub.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <input type="text" placeholder="Notes..." value={editFormData.notes} className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                        onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#2b6cb0', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={ruleTargetField === 'notes'} 
                          onChange={(e) => setRuleTargetField(e.target.checked ? 'notes' : '')} 
                        />
                        📝 Learn from notes text
                      </label>
                    </div>
                  </td>
                  <td>
                    <select value={editFormData.is_income} className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                      onChange={e => setEditFormData({ ...editFormData, is_income: e.target.value === 'true' })} >
                      <option value="false">Expense</option>
                      <option value="true">Income</option>
                    </select>
                  </td>
                  <td>
                    <input type="number" step="0.01" value={editFormData.amount} required className="form-inline-input" style={{ padding: '0.25rem', fontSize: '0.85rem', fontWeight: '500' }}
                      onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })} />
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button type="button" onClick={handleRowSave} className="inlineButton" style={{ background: '#f0fff4', color: '#22543d', borderColor: '#c6f6d5' }}>Save</button>
                      <button type="button" onClick={cancelEdit} className="inlineButton">Cancel</button>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={exp.id} style={{ background: isChecked ? '#f7fafc' : 'transparent' }}>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => handleSelectRow(exp.id)}
                  />
                </td>
                <td className="ledger-table-date" style={{fontSize: '0.85rem'}}>{exp.date}</td>
                <td style={{fontSize: '0.85rem'}}>{exp.description}</td>
                <td style={{fontSize: '0.85rem'}}>{displayAccountName}</td>
                <td style={{fontSize: '0.85rem'}}>{displayCategory.icon} {displayCategory.name}</td>
                <td style={{fontSize: '0.85rem'}}>{exp.notes || <span style={{ color: '#ccc' }}>—</span>}</td>
                <td style={{fontSize: '0.85rem'}}>{exp.is_income ? 'Income' : 'Expense'}</td>
                <td className="ledger-table-amount" style={{ color: exp.is_income ? '#22543d' : '#2d3748', fontSize: '0.85rem'}}>
                  £{Number(exp.amount).toFixed(2)}
                </td>
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', fontSize: '0.85rem'}}>
                    <button type="button" onClick={() => startEdit(exp)} className="inlineButton table-icon-btn" title="Edit Transaction" aria-label="Edit Transaction">✏️</button>
                    <button type="button" onClick={() => onDelete && onDelete(exp.id)} className="inlineButton table-icon-btn table-icon-btn--delete" style={{ background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }} title="Delete Transaction" aria-label="Delete Transaction">🗑️</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}