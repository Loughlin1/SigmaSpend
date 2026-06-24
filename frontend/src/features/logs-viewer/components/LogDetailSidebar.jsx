import './LogDetailSidebar.css';
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
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short',
      day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function LogDetailSidebar({ entry, onClose }) {
  if (!entry) return null;

  return (
    <>
      <div className="log-sidebar-backdrop" onClick={onClose} />
      <aside className="log-sidebar">
        <div className="log-sidebar__header">
          <h3 className="log-sidebar__title">Log Detail</h3>
          <button className="log-sidebar__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="log-sidebar__body">
          <dl className="log-sidebar__fields">
            <div className="log-sidebar__field">
              <dt>Timestamp</dt>
              <dd>{formatTimestamp(entry.timestamp)}</dd>
            </div>
            <div className="log-sidebar__field">
              <dt>Level</dt>
              <dd>
                <span className={`log-level-badge ${LEVEL_CLASSES[entry.level] || ''}`}>
                  {entry.level || 'UNKNOWN'}
                </span>
              </dd>
            </div>
            <div className="log-sidebar__field">
              <dt>Module</dt>
              <dd className="log-sidebar__mono">{entry.module || '—'}</dd>
            </div>
            {entry.http_method && (
              <div className="log-sidebar__field">
                <dt>Method</dt>
                <dd>
                  <span className={`log-method-badge log-method--${entry.http_method.toLowerCase()}`}>
                    {entry.http_method}
                  </span>
                </dd>
              </div>
            )}
            {entry.http_path && (
              <div className="log-sidebar__field">
                <dt>Endpoint</dt>
                <dd className="log-sidebar__mono">{entry.http_path}</dd>
              </div>
            )}
            <div className="log-sidebar__field log-sidebar__field--full">
              <dt>Message</dt>
              <dd className="log-sidebar__message">{entry.message}</dd>
            </div>
          </dl>

          {entry.payload != null && (
            <div className="log-sidebar__section">
              <h4 className="log-sidebar__section-title">Payload</h4>
              <pre className="log-sidebar__json">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            </div>
          )}

          {entry.exception && (
            <div className="log-sidebar__section">
              <h4 className="log-sidebar__section-title log-sidebar__section-title--error">Exception</h4>
              <pre className="log-sidebar__json log-sidebar__json--error">
                {entry.exception}
              </pre>
            </div>
          )}

          {entry.payload == null && !entry.exception && (
            <p className="log-sidebar__empty">No additional payload for this entry.</p>
          )}
        </div>
      </aside>
    </>
  );
}
