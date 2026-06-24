// src/components/AnalyticsFilters.jsx

export default function AnalyticsFilters({ chartFilters, onFilterChange, accounts = [] }) {
  const handleUpdate = (field, value) => {
    onFilterChange({
      ...chartFilters,
      [field]: value
    });
  };

  return (
    <div className="actionsRow" style={{ gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Scope Filtering (Optional extra context matching ledger options) */}
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

      {/* Interval Resolution Toggle */}
      <select 
        value={chartFilters.group_by || 'month'} 
        onChange={(e) => handleUpdate('group_by', e.target.value)}
        className="inlineButton"
      >
        <option value="day">Group By Day</option>
        <option value="month">Group By Month</option>
        <option value="year">Group By Year</option>
      </select>

      {/* Date boundaries */}
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
    </div>
  );
}