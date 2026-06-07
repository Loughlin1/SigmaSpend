import React from 'react';

// FIX: Added categories = [] to the destructured props
export default function LedgerFilters({ filters, onFilterChange, accountNameMap, categories = [] }) {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'is_income') {
      if (value === 'true') processedValue = true;
      if (value === 'false') processedValue = false;
      if (value === '') processedValue = '';
    }
    onFilterChange(name, processedValue);
  };

  const resetFilters = () => {
    onFilterChange('reset', null);
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Type</label>
        <select name="is_income" value={String(filters.is_income)} onChange={handleChange} className='inlineButton'>
          <option value="">All Types</option>
          <option value="false">Expense</option>
          <option value="true">Income</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Account</label>
        <select name="account_id" value={filters.account_id} onChange={handleChange} className='inlineButton'>
          <option value="">All Accounts</option>
          {Object.entries(accountNameMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Category</label>
        <select 
          name="category" 
          value={filters.category} 
          onChange={handleChange} 
          className='inlineButton'
        >
          <option value="">All Categories</option>
          <option value="Uncategorized">❓ Uncategorized</option>
          
          {categories.map((cat) => (
            /* Updated to include the category's custom emoji icon in the grouping header */
            <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
              {/* Allow filtering broadly by the top-level grouping option */}
              <option value={cat.name}>{cat.icon || '📁'} {cat.name} (All)</option>
              
              {/* Map nested children subcategories inside the indent view */}
              {cat.subcategories?.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  🔹 {sub.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
        <input type="date" name="start_date" value={filters.start_date} onChange={handleChange} className='inlineButton'/>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>End Date</label>
        <input type="date" name="end_date" value={filters.end_date} onChange={handleChange} className='inlineButton'/>
      </div>

      <button type="button" onClick={resetFilters} className='inlineButton'>Clear Filters</button>
    </div>
  );
}