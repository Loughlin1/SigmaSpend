import '../../../styles/filters.css';

const LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const LIMITS = [50, 100, 200, 500];

export default function LogFilters({ filters, modules, httpMethods, onChange, onSearch, onReset }) {
  return (
    <div className="ledger-filters" style={{ flexWrap: 'wrap' }}>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label">Level</label>
        <select
          className="ledger-filters__select"
          value={filters.level}
          onChange={e => onChange('level', e.target.value)}
        >
          <option value="">All levels</option>
          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label">Module</label>
        <select
          className="ledger-filters__select"
          value={filters.module}
          onChange={e => onChange('module', e.target.value)}
        >
          <option value="">All modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label">Method</label>
        <select
          className="ledger-filters__select"
          value={filters.http_method}
          onChange={e => onChange('http_method', e.target.value)}
        >
          <option value="">All methods</option>
          {httpMethods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label">Endpoint</label>
        <input
          type="text"
          className="ledger-filters__date"
          placeholder="/api/v1/expenses"
          value={filters.http_path}
          onChange={e => onChange('http_path', e.target.value)}
        />
      </div>

      <div className="ledger-filters__field" style={{ flexGrow: 2, minWidth: '200px' }}>
        <label className="ledger-filters__label">Search</label>
        <input
          type="search"
          className="ledger-filters__date"
          placeholder="Search message or payload…"
          value={filters.search}
          onChange={e => onChange('search', e.target.value)}
        />
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label">Since</label>
        <input
          type="datetime-local"
          className="ledger-filters__date"
          value={filters.since}
          onChange={e => onChange('since', e.target.value)}
        />
      </div>

      <div className="ledger-filters__field">
        <label className="ledger-filters__label">Limit</label>
        <select
          className="ledger-filters__select"
          value={filters.limit}
          onChange={e => onChange('limit', Number(e.target.value))}
        >
          {LIMITS.map(l => <option key={l} value={l}>{l} entries</option>)}
        </select>
      </div>

      <div className="ledger-filters__actions" style={{ gap: '0.5rem' }}>
        <button className="button" onClick={onSearch}>Search</button>
        <button className="inlineButton ledger-filters__reset-btn" onClick={onReset}>Reset</button>
      </div>

    </div>
  );
}
