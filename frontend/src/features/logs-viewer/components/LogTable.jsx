import './LogTable.css';

const LEVEL_CLASSES = {
  DEBUG: 'log-level--debug',
  INFO: 'log-level--info',
  WARNING: 'log-level--warning',
  ERROR: 'log-level--error',
  CRITICAL: 'log-level--critical',
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function LogTable({ entries, onSelectEntry }) {
  if (!entries.length) {
    return <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No log entries match the current filters.</p>;
  }

  return (
    <div className="log-table-wrapper">
      <table className="table log-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Message</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={i}
              className={`log-row log-row--${(entry.level || 'unknown').toLowerCase()} log-row--clickable`}
              onClick={() => onSelectEntry(entry)}
              title="Click to view details"
            >
              <td data-label="Timestamp" className="log-cell--timestamp">
                {formatTimestamp(entry.timestamp)}
              </td>
              <td data-label="Level">
                <span className={`log-level-badge ${LEVEL_CLASSES[entry.level] || ''}`}>
                  {entry.level || 'UNKNOWN'}
                </span>
              </td>
              <td data-label="Method">
                {entry.http_method
                  ? <span className={`log-method-badge log-method--${entry.http_method.toLowerCase()}`}>{entry.http_method}</span>
                  : <span className="log-payload-empty">—</span>}
              </td>
              <td data-label="Endpoint" className="log-cell--module">{entry.http_path || '—'}</td>
              <td data-label="Message" className="log-cell--message">{entry.message}</td>
              <td data-label="Payload" className="log-cell--payload">
                {entry.payload != null
                  ? <span className="log-payload-badge">JSON</span>
                  : <span className="log-payload-empty">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
