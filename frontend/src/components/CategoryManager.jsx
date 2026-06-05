// src/components/CategoryManager.jsx
import React, { useState } from 'react';

export default function CategoryManager({ categories, onCreateCategory }) {
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newCategory.trim()) return;

    try {
      await onCreateCategory(newCategory);
      setNewCategory('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save category');
    }
  };

  return (
    <div className="sectionCard" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
      <h4>Manage Expense Categories</h4>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="New category name (e.g., Utilities)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ flex: 1, padding: '0.4rem' }}
        />
        <button type="submit" className="inlineButton">Add</button>
      </form>
      
      {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <span
            key={cat.id}
            style={{
              background: '#e0e0e0',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#333'
            }}
          >
            {cat.name}
          </span>
        ))}
      </div>
    </div>
  );
}