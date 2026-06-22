// src/components/LedgerTable.jsx
import React, { useState } from 'react';
import '../styles/lists.css';
import '../styles/forms.css';

export default function LedgerTable({ 
  expenses = [], 
  accountNameMap = {}, 
  categories = [], 
  onExpenseSaved, 
  onDelete,
  onCreateRuleFromTransaction 
}) {
  const [editingId, setEditingId] = useState(null);
  const [ruleTargetField, setRuleTargetField] = useState("");
  const [editFormData, setEditFormData] = useState({
    id: '', date: '', description: '', account_id: '', category_id: '', notes: '', is_income: false, amount: ''
  });

  // --- CLEAN EXTRACTED SAVING HANDLER ---
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

      // 1. Isolated Rule Engine learning step
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
            // Captures backend error details (like "A rule for this keyword already exists.")
            const errorMsg = ruleErr.response?.data?.detail || "Rule criteria validation failed.";
            alert(`⚠️ Transaction saved, but Rule Creation Failed:\n${errorMsg}`);
          }
        }
      }

      // 2. This now executes successfully even if the rule creation fails!
      if (typeof onExpenseSaved === 'function') {
        await onExpenseSaved(payload);
      }

      // 3. Clean up interaction flags safely
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
      // Update: Fallback safely to empty string if no category_id is linked yet (Uncategorized)
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

  // Find elements dynamically using item ID values instead of unstable strings
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
      .trim(); // Cleans up any accidental trailing spaces
  };

  return (
    <div className="ledger-table-container">
      <table border="1" cellPadding="10" className="table ledger-table-view" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Date</th>
            <th style={{ width: '25%' }}>Description</th>
            <th style={{ width: '10%' }}>Account</th>
            <th style={{ width: '15%' }}>Category</th>
            <th style={{ width: '15%' }}>Notes</th>
            <th style={{ width: '8%' }}>Type</th>
            <th style={{ width: '10%' }}>Amount</th>
            <th style={{ width: '5%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => {
            const isCurrentRowEditing = editingId === exp.id;
            const displayCategory = getCategoryDisplay(exp.category_id);
            const displayAccountName = getAccountAbbreviation(accountNameMap[exp.account_id] || exp.account_id);

            if (isCurrentRowEditing) {
              return (
                <tr key={exp.id} style={{ background: '#f7fafc' }}>
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
                      <button 
                        type="button" 
                        onClick={handleRowSave} 
                        className="inlineButton" 
                        style={{ background: '#f0fff4', color: '#22543d', borderColor: '#c6f6d5' }}
                      >
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

            return (
              <tr key={exp.id}>
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
                    <button 
                      type="button" 
                      onClick={() => startEdit(exp)} 
                      className="inlineButton table-icon-btn"
                      title="Edit Transaction"
                      aria-label="Edit Transaction"
                    >
                      ✏️
                    </button>
                    <button
                      type="button" 
                      onClick={() => onDelete && onDelete(exp.id)} 
                      className="inlineButton table-icon-btn table-icon-btn--delete"
                      style={{ background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }}
                      title="Delete Transaction"
                      aria-label="Delete Transaction"
                    >
                      🗑️
                    </button>
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