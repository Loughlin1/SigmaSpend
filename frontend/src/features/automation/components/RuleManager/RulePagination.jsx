// src/features/automation/components/RulePagination.jsx
import React from 'react';

export default function RulePagination({ pagination, loading, onPageChange }) {
  if (pagination.pages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: '1px solid #eee', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.9rem', color: '#666' }}>
        Page <strong>{pagination.page}</strong> of {pagination.pages}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          className="inlineButton"
          disabled={pagination.page <= 1 || loading}
          onClick={() => onPageChange(pagination.page - 1)}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
        >
          ◀ Prev
        </button>
        <button 
          className="inlineButton"
          disabled={pagination.page >= pagination.pages || loading}
          onClick={() => onPageChange(pagination.page + 1)}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}