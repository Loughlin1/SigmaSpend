// src/features/ledger/components/LedgerTable/LedgerRowEdit.jsx
import { useState } from 'react';

export default function LedgerRowEdit({ 
  expense, 
  accountNameMap, 
  categories, 
  onSave, 
  onCancel,
  onCreateRuleFromTransaction 
}) {
  const [ruleTargetField, setRuleTargetField] = useState("");
  const [editFormData, setEditFormData] = useState({
    id: expense.id,
    date: expense.date && expense.date.includes('/') ? expense.date.split('/').reverse().join('-') : expense.date || '',
    description: expense.description || '',
    account_id: expense.account_id || '',
    category_id: expense.category_id != null ? String(expense.category_id) : '',
    notes: expense.notes || '',
    is_income: !!expense.is_income,
    amount: expense.amount != null ? String(expense.amount) : ''
  });

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    
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
        const ruleKeyword = ruleTargetField === 'description' ? editFormData.description : editFormData.notes;
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
    onSave(payload);
  };

  return (
    <tr style={{ background: '#f7fafc' }}>
      <td></td>
      <td style={{ verticalAlign: 'top' }}>
        <input type="date" value={editFormData.date} className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
          onChange={e => setEditFormData({ ...editFormData, date: e.target.value })} />
      </td>
      <td style={{ verticalAlign: 'top' }}>
        <div className="ledger-inline-edit-container">
          <input type="text" value={editFormData.description} required className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
            onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} />
          <label>
            <input type="checkbox" checked={ruleTargetField === 'description'} onChange={(e) => setRuleTargetField(e.target.checked ? 'description' : '')} />
            ⚡ Learn from description text
          </label>
        </div>
      </td>
      <td style={{ verticalAlign: 'top' }}>
        <select value={editFormData.account_id} required className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
          onChange={e => setEditFormData({ ...editFormData, account_id: e.target.value })} >
          <option value="">Select Account</option>
          {Object.entries(accountNameMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </td>
      <td style={{ verticalAlign: 'top' }}>
        <select value={editFormData.category_id} className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
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
      <td style={{ verticalAlign: 'top' }}>
        <div className="ledger-inline-edit-container">
          <input type="text" placeholder="Notes..." value={editFormData.notes} className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
            onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })} />
          <label>
            <input type="checkbox" checked={ruleTargetField === 'notes'} onChange={(e) => setRuleTargetField(e.target.checked ? 'notes' : '')} />
            📝 Learn from notes text
          </label>
        </div>
      </td>
      <td style={{ verticalAlign: 'top' }}>
        <select value={editFormData.is_income} className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
          onChange={e => setEditFormData({ ...editFormData, is_income: e.target.value === 'true' })} >
          <option value="false">Expense</option>
          <option value="true">Income</option>
        </select>
      </td>
      <td style={{ verticalAlign: 'top' }}>
        <input type="number" step="0.01" value={editFormData.amount} required className="form-inline-input" style={{ padding: '0.35rem', fontSize: '0.85rem', fontWeight: '500', margin: 0 }}
          onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })} />
      </td>
      <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center', height: '32px' }}>
          <button type="button" onClick={handleSubmit} className="inlineButton table-icon-btn" style={{ background: '#e6fffa', color: '#234e52', borderColor: '#b2f5ea', padding: '0.25rem 0.4rem', fontSize: '0.9rem' }} title="Save Changes">💾</button>
          <button type="button" onClick={onCancel} className="inlineButton table-icon-btn" style={{ background: '#edf2f7', color: '#4a5568', borderColor: '#cbd5e0', padding: '0.25rem 0.4rem', fontSize: '0.9rem' }} title="Cancel Edit">❌</button>
        </div>
      </td>
    </tr>
  );
}