// src/components/CategoryManager.jsx
import React, { useState } from 'react';
import '../../../styles/lists.css';
import '../../../styles/forms.css';

export default function CategoryManager({ categories = [], onCreateCategory, loading, error }) {
  const [newName, setNewName] = useState('');
  const [targetParentId, setTargetParentId] = useState(''); // Empty string means Root Category
  const [showForm, setShowForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!newName.trim()) return;

    setSaving(true);
    try {
      const pid = targetParentId === '' ? null : Number(targetParentId);
      await onCreateCategory(newName.trim(), pid);
      setNewName('');
      setTargetParentId('');
      setShowForm(false);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="sectionCard">
      <div className="account-list">
        <div className="account-list__header" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h3>Categories & Subcategories</h3>
          <button className="collapse-button" type="button">{isCollapsed ? 'Show' : 'Hide'}</button>
        </div>

        {!isCollapsed && (
          <>
            {error && <div className="account-list__error">{error}</div>}
            {loading ? <div>Loading tree...</div> : (
              <div className="account-list__wrapper">
                <table className="bank-account-table">
                  <thead>
                    <tr>
                      <th className="table-header-cell" style={{ width: '30%', textAlign: 'left' }}>Main Category</th>
                      <th className="table-header-cell" style={{ textAlign: 'left' }}>Subcategories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: 'bold', verticalAlign: 'top', paddingTop: '0.5rem', textAlign: 'left' }}>
                          <span style={{ marginRight: '0.5rem' }}>{cat.icon || '📁'}</span>
                          {cat.name}
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '0.5rem', textAlign: 'left' }}>
                          {cat.subcategories?.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {cat.subcategories.map(sub => (
                                <span key={sub.id} style={{ background: '#edf2f7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', color: '#333' }}>
                                  {sub.name}
                                </span>
                              ))}
                            </div>
                          ) : <span style={{ color: '#aaa', fontSize: '0.85rem' }}>None</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="account-list__creation-zone" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
              <button type="button" onClick={() => setShowForm(!showForm)} className="button">
                {showForm ? 'Hide Form' : 'Create Category/Subcategory'}
              </button>
              
              {showForm && (
                <section className="form" style={{ marginTop: '15px' }}>
                  <form onSubmit={handleSubmit} className="form__grid form__grid--wide">
                    
                    <label className="form-field-wrapper">
                      Name
                      <input
                        type="text"
                        placeholder="Name (e.g., Utilities)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                        className='form-inline-input'
                      />
                    </label>

                    <label className="form-field-wrapper">
                      Category Type
                      <select 
                        value={targetParentId}
                        onChange={(e) => setTargetParentId(e.target.value)}
                        className='form-inline-input'
                      >
                        <option value="">Treat as Top-Level Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>Child of: {cat.name}</option>
                        ))}
                      </select>
                    </label>

                    {saveError && (
                      <div style={{ gridColumn: '1 / -1', color: '#cc0000', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        ⚠️ {saveError}
                      </div>
                    )}

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                      <button type="button" onClick={() => setShowForm(false)} className='form__cancel'>Cancel</button>
                      <button type="submit" disabled={saving} className='form__submit' style={{ background: '#3182ce', color: 'white' }}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>

                  </form>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}