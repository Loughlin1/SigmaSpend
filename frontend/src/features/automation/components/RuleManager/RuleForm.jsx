// src/features/automation/components/RuleForm.jsx
import { useState } from 'react';

export default function RuleForm({ categories, onCreateRule, onCancel }) {
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [matchField, setMatchField] = useState('description');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    
    if (!keyword.trim() || !categoryId) {
      setSaveError('Please provide both a keyword and a target category.');
      return;
    }

    setSaving(true);
    try {
      await onCreateRule({
        keyword: keyword.trim().toLowerCase(),
        category_id: parseInt(categoryId, 10),
        match_field: matchField
      });
      setKeyword('');
      setCategoryId('');
      setMatchField('description');
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Unable to save rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form">
      <form onSubmit={handleSubmit} className="form__grid form__grid--wide">
        <label className="form-field-wrapper">
          Keyword Trigger
          <input
            type="text"
            placeholder="e.g., starbucks (case-insensitive)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={saving}
            className="form-inline-input"
          />
        </label>
        
        <label className="form-field-wrapper">
          Target Field
          <select
            value={matchField}
            onChange={(e) => setMatchField(e.target.value)}
            disabled={saving}
            className="form-inline-input"
          >
            <option value="description">Description</option>
            <option value="notes">Notes</option>
          </select>
        </label>
        
        <label className="form-field-wrapper">
          Target Destination Category
          <select 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={saving}
            className="form-inline-input"
          >
            <option value="" disabled>-- Choose Target --</option>
            {categories.map(cat => (
              <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
                <option value={cat.id}>{cat.name} (General)</option>
                {cat.subcategories?.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
          <button type="button" onClick={onCancel} disabled={saving} className="form__cancel">Cancel</button>
          <button type="submit" disabled={saving} className="form__submit" style={{ background: '#3182ce', color: 'white' }}>Save Rule</button>
        </div>
        {saveError && <div style={{ gridColumn: '1 / -1', color: 'red', fontSize: '0.85rem' }}>{saveError}</div>}
      </form>
    </section>
  );
}