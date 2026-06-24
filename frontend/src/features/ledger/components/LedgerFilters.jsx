// src/components/LedgerFilters.jsx
import { useState, useEffect } from 'react';
import '../../../styles/filters.css'

export default function LedgerFilters({ filters, onFilterChange, accountNameMap, categories = [] }) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSearch(filters.q || '');
  }, [filters.q]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onFilterChange('q', localSearch);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [localSearch, onFilterChange]);

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
    setLocalSearch('');
    onFilterChange('reset', null);
  };

  return (
    <div className="ledger-filters">
      {/* 1: Top Row full-width search input */}
      <div className="ledger-filters__field ledger-filters__field--search">
        <label className="ledger-filters__label" htmlFor="search_input">Search Ledger</label>
        <input 
          id="search_input"
          type="text"
          placeholder="Search description or notes..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="ledger-filters__input"
        />
      </div>

      {/* 2: Secondary flow wrapping row for specific sub-filters */}
      <div className="ledger-filters__field">
        <label className="ledger-filters__label" htmlFor="filter_is_income">Type</label>
        <select id="filter_is_income" name="is_income" value={String(filters.is_income)} onChange={handleChange} className="ledger-filters__select">
          <option value="">All Types</option>
          <option value="false">Expense</option>
          <option value="true">Income</option>
        </select>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label" htmlFor="filter_account_id">Account</label>
        <select id="filter_account_id" name="account_id" value={filters.account_id} onChange={handleChange} className="ledger-filters__select">
          <option value="">All Accounts</option>
          {Object.entries(accountNameMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label" htmlFor="filter_category">Category</label>
        <select id="filter_category" name="category" value={filters.category} onChange={handleChange} className="ledger-filters__select">
          <option value="">All Categories</option>
          <option value="Uncategorized">❓ Uncategorized</option>
          {categories.map((cat) => (
            <optgroup key={cat.id} label={`${cat.icon || '📁'} ${cat.name}`}>
              <option value={cat.name}>{cat.icon || '📁'} {cat.name} (All)</option>
              {cat.subcategories?.map((sub) => (
                <option key={sub.id} value={sub.name}>🔹 {sub.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label" htmlFor="filter_start_date">Start Date</label>
        <input id="filter_start_date" type="date" name="start_date" value={filters.start_date} onChange={handleChange} className="ledger-filters__date"/>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label" htmlFor="filter_end_date">End Date</label>
        <input id="filter_end_date" type="date" name="end_date" value={filters.end_date} onChange={handleChange} className="ledger-filters__date"/>
      </div>

      <div className="ledger-filters__actions">
        <button type="button" onClick={resetFilters} className="inlineButton ledger-filters__reset-btn">
          Clear Filters
        </button>
      </div>
    </div>
  );
}