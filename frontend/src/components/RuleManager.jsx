import React, { useState } from 'react';
import './BankAccountList.css'; // Reusing your global architecture styling

export default function RuleManager({ rules = [], categories = [], onCreateRule, onDeleteRule, loading, error }) {
  const [keyword, setKeyword] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!keyword.trim() || !targetCategory) {
      setSaveError('Please provide both a keyword and a target category.');
      return;
    }

    setSaving(true);
    try {
      await onCreateRule({
        keyword: keyword.trim().lower(),
        target_category: targetCategory
      });
      setKeyword('');
      setTargetCategory('');
      setShowForm(false);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Unable to save rule.');
    } locate; {
      setSaving(false);
    }
  };

  return (
    <div className="account-list">
      <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>Processing Rules ({rules.length})</h3>
        <button className="collapse-button" type="button">
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {error && <div className="account-list__error">{error}</div>}
          
          {loading ? (
            <div>Loading rules engine...</div>
          ) : rules.length === 0 ? (
            <div>No keyword mapping rules configured yet.</div>
          ) : (
            <div className="account-list__wrapper">
              <table className="bank-account-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th className="table-header-cell" style={{ width: '40%', textAlign: 'left' }}>Keyword</th>
                    <th className="table-header-cell" style={{ width: '40%', textAlign: 'left' }}>Maps To</th>
                    <th className="table-header-cell" style={{ width: '20%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#e53e3e', textAlign: 'left' }}>
                        "{rule.keyword}"
                      </td>
                      <td style={{ fontWeight: '600', textAlign: 'left' }}>
                        {rule.target_category}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => onDeleteRule && onDeleteRule(rule.id)}
                          style={{ padding: '2px 8px', background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="account-list__creation-zone" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
            <button type="button" onClick={() => setShowForm(!showForm)} className="button">
              {showForm ? 'Hide Form' : 'Create New Keyword Rule'}
            </button>

            {showForm && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '350px', marginTop: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Keyword Trigger:</label>
                  <input
                    type="text"
                    placeholder="e.g., starbucks (case-insensitive)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Target Destination Category:</label>
                  <select 
                    value={targetCategory} 
                    onChange={(e) => setTargetCategory(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">-- Choose Target --</option>
                    {categories.map(cat => (
                      <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
                        <option value={cat.name}>{cat.name} (General)</option>
                        {cat.subcategories?.map(sub => (
                          <option key={sub.id} value={sub.name}>{sub.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '5px' }}>
                  <button type="submit" disabled={saving}>Save Rule</button>
                  <button type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
                </div>
                {saveError && <div style={{ color: 'red', fontSize: '0.85rem' }}>{saveError}</div>}
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}