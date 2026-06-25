// src/components/LedgerFilters.jsx
import { useState, useEffect } from 'react';
import '../../../styles/filters.css';

const INITIAL_FILTERS_DEFAULTS = {
  is_income: '',
  account_id: '',
  category: '',
  start_date: '',
  end_date: '',
  min_amount: '',
  max_amount: '',
  sort_date: 'desc',
};

function countActiveFilters(filters) {
  return Object.entries(INITIAL_FILTERS_DEFAULTS).filter(([key, defaultVal]) => {
    const current = filters[key];
    return current !== undefined && String(current) !== String(defaultVal) && current !== '';
  }).length;
}

export default function LedgerFilters({ filters, onFilterChange, accountNameMap, categories = [] }) {
  const [localSearch, setLocalSearch] = useState(filters.q || '');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
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

  const activeCount = countActiveFilters(filters);

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Top bar: search + filter toggle */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search description or notes..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="ledger-filters__input"
          style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}
        />

        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="inlineButton"
          style={{ whiteSpace: 'nowrap', position: 'relative' }}
        >
          {drawerOpen ? 'Hide Filters' : 'Filters'}
          {activeCount > 0 && (
            <span style={{
              marginLeft: '0.4rem',
              background: '#3182ce',
              color: '#fff',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.1rem 0.45rem',
              lineHeight: 1.4,
            }}>
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button type="button" onClick={resetFilters} className="inlineButton" style={{ color: '#e53e3e', borderColor: '#feb2b2' }}>
            Clear
          </button>
        )}
      </div>

      {/* Collapsible filter drawer */}
      {drawerOpen && (
        <div className="ledger-filters" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
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
            <input id="filter_start_date" type="date" name="start_date" value={filters.start_date} onChange={handleChange} className="ledger-filters__date" />
          </div>

          <div className="ledger-filters__field">
            <label className="ledger-filters__label" htmlFor="filter_end_date">End Date</label>
            <input id="filter_end_date" type="date" name="end_date" value={filters.end_date} onChange={handleChange} className="ledger-filters__date" />
          </div>

          <div className="ledger-filters__field">
            <label className="ledger-filters__label" htmlFor="filter_min_amount">Min Amount (£)</label>
            <input id="filter_min_amount" type="number" name="min_amount" value={filters.min_amount} onChange={handleChange} className="ledger-filters__input" min="0" step="0.01" placeholder="0.00" />
          </div>

          <div className="ledger-filters__field">
            <label className="ledger-filters__label" htmlFor="filter_max_amount">Max Amount (£)</label>
            <input id="filter_max_amount" type="number" name="max_amount" value={filters.max_amount} onChange={handleChange} className="ledger-filters__input" min="0" step="0.01" placeholder="Any" />
          </div>

          <div className="ledger-filters__field">
            <label className="ledger-filters__label" htmlFor="filter_sort_date">Date Order</label>
            <select id="filter_sort_date" name="sort_date" value={filters.sort_date} onChange={handleChange} className="ledger-filters__select">
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
