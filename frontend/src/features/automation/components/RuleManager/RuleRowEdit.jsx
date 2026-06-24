// src/features/automation/components/RuleRowEdit.jsx
import { useState } from 'react';

export default function RuleRowEdit({ rule, categories, onSave, onCancel }) {
  const [keyword, setKeyword] = useState(rule.keyword || '');
  const [matchField, setMatchField] = useState(rule.match_field || 'description');
  const [categoryId, setCategoryId] = useState(rule.category_id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!keyword.trim() || !categoryId) {
      setError('Keyword and target category are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(rule.id, {
        keyword: keyword.trim().toLowerCase(),
        match_field: matchField,
        category_id: parseInt(categoryId, 10),
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update rule.');
      setSaving(false);
    }
  };

  return (
    <tr style={{ background: '#f7fafc' }}>
      <td style={{ verticalAlign: 'middle' }}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          disabled={saving}
          className="form-inline-input"
          style={{ width: '100%', padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
        />
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        <select
          value={matchField}
          onChange={(e) => setMatchField(e.target.value)}
          disabled={saving}
          className="form-inline-input"
          style={{ width: '100%', padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
        >
          <option value="description">Description</option>
          <option value="notes">Notes</option>
        </select>
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        <select 
          value={categoryId} 
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={saving}
          className="form-inline-input"
          style={{ width: '100%', padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
        >
          {categories.map(cat => (
            <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
              <option value={cat.id}>{cat.name} (General)</option>
              {cat.subcategories?.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </td>
      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center' }}>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '2px 8px', background: '#e6fffa', color: '#234e52', borderColor: '#b2f5ea', borderRadius: '4px', cursor: 'pointer' }}>
            {saving ? '...' : '💾'}
          </button>
          <button type="button" onClick={onCancel} disabled={saving} style={{ padding: '2px 8px', background: '#edf2f7', color: '#4a5568', borderColor: '#cbd5e0', borderRadius: '4px', cursor: 'pointer' }}>
            ❌
          </button>
        </div>
        {error && <div style={{ color: 'red', fontSize: '0.7rem', marginTop: '4px' }}>{error}</div>}
      </td>
    </tr>
  );
}