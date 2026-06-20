// src/components/RuleManager.jsx
import React, { useState, useEffect } from 'react';
import '../styles/lists.css';
import '../styles/forms.css';

export default function RuleManager({ rules = [], categories = [], onCreateRule, onDeleteRule, fetchRules, loading, error }) {
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
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
        match_field: 'description' // Providing safe schema fallback default
      });
      setKeyword('');
      setCategoryId('');
      setShowForm(false);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Unable to save rule.');
    } finally {
      // Fix: Replaced broken "locate;" statement with valid "finally" block execution
      setSaving(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Automatically trigger a refresh when the user types a search value
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (typeof fetchRules === 'function') {
        fetchRules(searchQuery);
      }
    }, 300); // 300ms Debounce prevents slamming your FastAPI instance with requests on every single keystroke

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchRules]);


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
          {/* ⚡ SEARCH INPUT BAR LAYER ⚡ */}
          <div style={{ padding: '10px 0', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="🔍 Search rules by trigger keyword or category destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rule-search-input"
            />
          </div>

          <div className="account-list__creation-zone" style={{ margin: '15px 0', padding: '15px 0', borderTop: '1px dashed #ccc'}}>
            <button type="button" onClick={() => setShowForm(!showForm)} className="button">
              {showForm ? 'Hide Form' : 'Create New Keyword Rule'}
            </button>

            {showForm && (
              <section className="form">
                <form onSubmit={handleSubmit} className="form__grid">
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
                          {/* Update: Option values now pass the internal integer IDs */}
                          <option value={cat.id}>{cat.name} (General)</option>
                          {cat.subcategories?.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <div className="form-field-wrapper">
                    <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="inlineButton form__cancel">Cancel</button>
                  </div>
                  <div className="form-field-wrapper">
                    <button type="submit" disabled={saving} className="inlineButton form__submit">Save Rule</button>
                  </div>
                  {saveError && <div style={{ color: 'red', fontSize: '0.85rem' }}>{saveError}</div>}
                </form>
              </section>
            )}
          </div>

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
                        {rule.category.icon} { rule.category.name || `Category #${rule.category_id}`}
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
        </>
      )}
    </div>
  );
}