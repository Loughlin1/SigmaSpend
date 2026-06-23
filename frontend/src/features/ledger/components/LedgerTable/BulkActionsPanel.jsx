// src/features/ledger/components/LedgerTable/BulkActionsPanel.jsx
import React from 'react';

export default function BulkActionsPanel({ 
  selectedCount, 
  bulkCategory, 
  setBulkCategory, 
  bulkUpdating, 
  onBulkSubmit, 
  onClearSelection, 
  categories 
}) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: 'sticky', top: '10px', zIndex: 10, display: 'flex', flexWrap: 'wrap',
      alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      background: '#ebf8ff', border: '1px solid #bee3f8', padding: '0.75rem 1rem',
      borderRadius: '6px', marginBottom: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <span style={{ fontSize: '0.9rem', color: '#2b6cb0', fontWeight: '500' }}>
        Selected <strong>{selectedCount}</strong> transactions
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
          onClick={onBulkSubmit}
          className="inlineButton"
          style={{ background: '#3182ce', color: 'white', padding: '0.35rem 1rem' }}
          disabled={bulkUpdating}
        >
          {bulkUpdating ? 'Updating...' : 'Apply Category'}
        </button>
        <button 
          onClick={onClearSelection}
          className="inlineButton" 
          style={{ padding: '0.35rem 0.75rem' }}
          disabled={bulkUpdating}
        >
          Clear
        </button>
      </div>
    </div>
  );
}