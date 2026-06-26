// src/components/LedgerFilters.jsx
import { useState, useEffect, useRef } from 'react';
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

function CategoryCombobox({ value, onChange, categories }) {
  // value is a comma-separated string of selected category values
  const selected = value ? value.split(',').filter(Boolean) : [];
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const allOptions = [
    { label: '❓ Uncategorized', value: 'Uncategorized' },
    ...categories.flatMap(cat => {
      const hasSubs = cat.subcategories?.length > 0;
      const icon = cat.icon || '📁';
      if (hasSubs) {
        return [
          { label: `${icon} ${cat.name} (All)`, value: cat.name, isParent: true },
          { label: `${icon} ${cat.name} (Direct)`, value: `${cat.name}::direct`, isParent: true },
          ...cat.subcategories.map(sub => ({ label: `  ${icon} ${sub.name}`, value: sub.name })),
        ];
      }
      return [{ label: `${icon} ${cat.name}`, value: cat.name, isParent: true }];
    }),
  ];

  const filtered = (inputVal
    ? allOptions.filter(o => o.label.toLowerCase().includes(inputVal.toLowerCase()))
    : allOptions
  ).filter(o => !selected.includes(o.value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (optValue) => {
    const next = selected.includes(optValue)
      ? selected.filter(v => v !== optValue)
      : [...selected, optValue];
    onChange(next.join(','));
    setInputVal('');
  };

  const remove = (optValue) => {
    onChange(selected.filter(v => v !== optValue).join(','));
  };

  const labelFor = (val) => allOptions.find(o => o.value === val)?.label.trim() || val;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Chips + input */}
      <div
        className="ledger-filters__select"
        onClick={() => setOpen(true)}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', cursor: 'text', minHeight: '2rem', height: 'auto', padding: '0.25rem 0.5rem' }}
      >
        {selected.map(val => (
          <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.78rem', color: '#2b6cb0', whiteSpace: 'nowrap' }}>
            {labelFor(val)}
            <button type="button" onMouseDown={e => { e.stopPropagation(); remove(val); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2b6cb0', padding: 0, lineHeight: 1, fontSize: '0.85rem' }}>×</button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'All Categories' : ''}
          style={{ border: 'none', outline: 'none', flex: 1, minWidth: '80px', fontSize: '0.85rem', background: 'transparent', padding: 0 }}
        />
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 100, top: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #cbd5e0', borderRadius: '6px',
          margin: '2px 0 0', padding: 0, listStyle: 'none',
          maxHeight: '220px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {filtered.map(opt => (
            <li
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); toggle(opt.value); }}
              style={{ padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: opt.isParent ? 600 : 400, color: '#2d3748', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = '#ebf8ff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
            <label className="ledger-filters__label">Category</label>
            <CategoryCombobox
              value={filters.category}
              onChange={(val) => onFilterChange('category', val)}
              categories={categories}
            />
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
