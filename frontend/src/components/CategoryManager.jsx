import React, { useState } from 'react';
import './BankAccountList.css'; // Reusing your exact style configurations

export default function CategoryManager({ categories = [], onCreateCategory, loading, error }) {
  const [newCategory, setNewCategory] = useState('');
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError('');
    if (!newCategory.trim()) {
      setSaveError('Category name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await onCreateCategory(newCategory.trim());
      setNewCategory('');
      setShowCreationForm(false);
    } catch (err) {
      console.error('Failed creating category', err);
      setSaveError(err.response?.data?.detail || 'Unable to save category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-list">
      {/* Header element to toggle collapse view */}
      <div className="account-list__header" onClick={toggleCollapse}>
        <h3>Expense Categories ({categories.length})</h3>
        <button className="collapse-button" type="button">
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {error ? (
            <div className="account-list__error">{error}</div>
          ) : null}

          {loading ? (
            <div>Loading categories...</div>
          ) : categories.length === 0 ? (
            <div>No categories found in the database.</div>
          ) : (
            <div className="account-list__wrapper">
              <table className="bank-account-table">
                <thead>
                  <tr>
                    <th className="table-header-cell">ID</th>
                    <th className="table-header-cell">Category Name</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>{cat.id}</td>
                      <td>{cat.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div 
            className="account-list__creation-zone" 
            style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}
          >
            <button 
              type="button" 
              onClick={() => setShowCreationForm((prev) => !prev)} 
              className="button"
              style={{ marginBottom: '15px' }}
            >
              {showCreationForm ? 'Hide Form' : 'Create New Category'}
            </button>
            
            {showCreationForm && (
              <div style={{ display: 'flex', justifyContent: 'center'}}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Category Name:</label>
                    <input
                      type="text"
                      placeholder="e.g., Utilities"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      disabled={saving}
                      style={{ padding: '0.4rem' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => { setShowCreationForm(false); setSaveError(''); }} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  
                  {saveError && <div className="save-error" style={{ color: 'red', fontSize: '0.85rem' }}>{saveError}</div>}
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}