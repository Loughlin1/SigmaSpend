// src/components/AnalyticsFilters.jsx
import { useState, useEffect } from 'react';
import { expenseApi } from '../../../api/client';

const CURRENT_YEAR = new Date().getFullYear();

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function boundsFromMonth(ym) {
  const [year, month] = ym.split('-').map(Number);
  const last = lastDayOfMonth(year, month);
  return {
    start_date: `${year}-${String(month).padStart(2, '0')}-01`,
    end_date:   `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

function boundsFromYear(year) {
  return { start_date: `${year}-01-01`, end_date: `${year}-12-31` };
}

function boundsFromYears(selected) {
  if (selected.length === 0) return {};
  const min = Math.min(...selected);
  const max = Math.max(...selected);
  return { start_date: `${min}-01-01`, end_date: `${max}-12-31` };
}

const MODES = ['month', 'year', 'years', 'custom'];

export default function AnalyticsFilters({ chartFilters, onFilterChange, accounts = [] }) {
  const [mode, setMode] = useState('month');
  const [availableYears, setAvailableYears] = useState([CURRENT_YEAR]);
  const [selectedYears, setSelectedYears] = useState([CURRENT_YEAR]);

  useEffect(() => {
    expenseApi.getYears()
      .then(years => {
        if (years.length > 0) setAvailableYears(years);
      })
      .catch(() => {}); // non-fatal — fallback stays as current year
  }, []);

  const currentMonthValue = chartFilters.start_date
    ? chartFilters.start_date.slice(0, 7)
    : new Date().toISOString().slice(0, 7);

  const currentYearValue = chartFilters.start_date
    ? parseInt(chartFilters.start_date.slice(0, 4))
    : CURRENT_YEAR;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'month') {
      onFilterChange({ ...chartFilters, ...boundsFromMonth(currentMonthValue) });
    } else if (newMode === 'year') {
      onFilterChange({ ...chartFilters, ...boundsFromYear(currentYearValue) });
    } else if (newMode === 'years') {
      onFilterChange({ ...chartFilters, ...boundsFromYears(selectedYears) });
    }
    // custom: leave dates as-is
  };

  const toggleYear = (year) => {
    const next = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year];
    if (next.length === 0) return; // always keep at least one
    setSelectedYears(next);
    onFilterChange({ ...chartFilters, ...boundsFromYears(next) });
  };

  const handleUpdate = (field, value) => {
    onFilterChange({ ...chartFilters, [field]: value });
  };

  return (
    <div className="actionsRow" style={{ gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={chartFilters.account_id || ''}
        onChange={(e) => handleUpdate('account_id', e.target.value)}
        className="inlineButton"
      >
        <option value="">All Accounts</option>
        {accounts.map(acc => (
          <option key={acc.account_id} value={acc.account_id}>
            {acc.bank_name || acc.account_name}
          </option>
        ))}
      </select>

      <select
        value={chartFilters.group_by || 'month'}
        onChange={(e) => handleUpdate('group_by', e.target.value)}
        className="inlineButton"
      >
        <option value="day">Group By Day</option>
        <option value="month">Group By Month</option>
        <option value="year">Group By Year</option>
      </select>

      {/* Date mode toggle */}
      <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e0' }}>
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.8rem',
              border: 'none',
              borderLeft: m !== MODES[0] ? '1px solid #cbd5e0' : 'none',
              cursor: 'pointer',
              background: mode === m ? '#3182ce' : '#fff',
              color: mode === m ? '#fff' : '#4a5568',
              fontWeight: mode === m ? 600 : 400,
            }}
          >
            {m === 'years' ? 'Multi-Year' : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode === 'month' && (
        <input
          type="month"
          value={currentMonthValue}
          onChange={(e) => onFilterChange({ ...chartFilters, ...boundsFromMonth(e.target.value) })}
          className="inlineButton"
        />
      )}

      {mode === 'year' && (
        <select
          value={currentYearValue}
          onChange={(e) => onFilterChange({ ...chartFilters, ...boundsFromYear(Number(e.target.value)) })}
          className="inlineButton"
        >
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}

      {mode === 'years' && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {availableYears.map(y => {
            const active = selectedYears.includes(y);
            return (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: active ? '#3182ce' : '#cbd5e0',
                  background: active ? '#ebf8ff' : '#fff',
                  color: active ? '#2b6cb0' : '#718096',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'custom' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>From:</span>
            <input
              type="date"
              value={chartFilters.start_date || ''}
              onChange={(e) => handleUpdate('start_date', e.target.value)}
              className="inlineButton"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>To:</span>
            <input
              type="date"
              value={chartFilters.end_date || ''}
              onChange={(e) => handleUpdate('end_date', e.target.value)}
              className="inlineButton"
            />
          </div>
        </>
      )}
    </div>
  );
}
