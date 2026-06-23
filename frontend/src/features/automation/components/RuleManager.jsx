// src/features/automation/components/RuleManager.jsx
import React, { useState, useEffect } from 'react';
import '../../../styles/lists.css';
import '../../../styles/forms.css';

export default function RuleManager({ 
  rules = [], 
  categories = [], 
  pagination = { page: 1, pages: 1, total: 0 },
  onCreateRule, 
  onDeleteRule, 
  fetchRules, 
  loading, 
  error 
}) {
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [matchField, setMatchField] = useState('description');
  const [showForm, setShowForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        match_field: matchField // Updated: Uses dynamic drop-down state value instead of hardcoded string
      });
      setKeyword('');
      setCategoryId('');
      setMatchField('description'); // Reset back to default
      setShowForm(false);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Unable to save rule.');
    } finally {
      setSaving(false);
    }
  };

  // Automatically trigger a refresh when search criteria or pagination page updates
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (typeof fetchRules === 'function') {
        fetchRules(searchQuery, pagination.page);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, pagination.page, fetchRules]);

  // Helper handling page changing actions safely
  const handlePageChange = (targetPage) => {
    if (typeof fetchRules === 'function') {
      fetchRules(searchQuery, targetPage);
    }
  };

  return (
    <section className="sectionCard">
      <div className="account-list">
        <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h3>Processing Rules ({pagination.total})</h3>
          <button className="collapse-button" type="button">
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            <div style={{ padding: '10px 0', marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="🔍 Search rules by trigger keyword or category destination..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (pagination.page !== 1 && typeof fetchRules === 'function') {
                    fetchRules(e.target.value, 1);
                  }
                }}
                className="rule-search-input"
              />
            </div>

            <div className="account-list__creation-zone" style={{ margin: '15px 0', padding: '15px 0', borderTop: '1px dashed #ccc'}}>
              <button type="button" onClick={() => setShowForm(!showForm)} className="button">
                {showForm ? 'Hide Form' : 'Create New Keyword Rule'}
              </button>

              {showForm && (
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
                      <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="form__cancel">Cancel</button>
                      <button type="submit" disabled={saving} className="form__submit" style={{ background: '#3182ce', color: 'white' }}>Save Rule</button>
                    </div>
                    {saveError && <div style={{ gridColumn: '1 / -1', color: 'red', fontSize: '0.85rem' }}>{saveError}</div>}
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
                      {/* Adjusted column widths to smoothly make room for the new field column */}
                      <th className="table-header-cell" style={{ width: '30%', textAlign: 'left' }}>Keyword</th>
                      <th className="table-header-cell" style={{ width: '25%', textAlign: 'left' }}>Target Field</th>
                      <th className="table-header-cell" style={{ width: '30%', textAlign: 'left' }}>Maps To</th>
                      <th className="table-header-cell" style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#e53e3e', textAlign: 'left' }}>
                          "{rule.keyword}"
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#4a5568', textAlign: 'left', textTransform: 'capitalize' }}>
                          {rule.match_field || 'Description'}
                        </td>
                        <td style={{ fontWeight: '600', textAlign: 'left' }}>
                          {rule.category?.icon} {rule.category?.name || `Category #${rule.category_id}`}
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

                {/* RESPONSIVE PAGINATION FOOTER UTILITY LAYER */}
                {pagination.pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: '1px solid #eee', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>
                      Page <strong>{pagination.page}</strong> of {pagination.pages}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="inlineButton"
                        disabled={pagination.page <= 1 || loading}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        ◀ Prev
                      </button>
                      <button 
                        className="inlineButton"
                        disabled={pagination.page >= pagination.pages || loading}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        Next ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}