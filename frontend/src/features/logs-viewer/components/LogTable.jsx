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

export default function LogTable({ entries }) {
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
            <th>Module</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className={`log-row log-row--${(entry.level || 'unknown').toLowerCase()}`}>
              <td data-label="Timestamp" className="log-cell--timestamp">
                {formatTimestamp(entry.timestamp)}
              </td>
              <td data-label="Level">
                <span className={`log-level-badge ${LEVEL_CLASSES[entry.level] || ''}`}>
                  {entry.level || 'UNKNOWN'}
                </span>
              </td>
              <td data-label="Module" className="log-cell--module">{entry.module}</td>
              <td data-label="Message" className="log-cell--message">{entry.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
