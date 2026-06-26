import { useState, useEffect, useCallback } from 'react';
import { backupApi } from '../../../api/client';

export default function BackupSection() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    backupApi.list()
      .then(setBackups)
      .catch(() => setBackups([]))
      .finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleTrigger = async () => {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await backupApi.trigger();
      setMessage({ type: 'success', text: `Backup created: ${res.path.split('/').pop()}` });
      load();
    } catch {
      setMessage({ type: 'error', text: 'Backup failed. Check server logs.' });
    } finally {
      setTriggering(false);
    }
  };

  const fmt = (iso) => new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="sectionCard">
      <div className="account-list__header" onClick={() => setIsCollapsed(p => !p)} style={{ cursor: 'pointer' }}>
        <h3 style={{ margin: 0 }}>Database Backups</h3>
        <button className="collapse-button" type="button">{isCollapsed ? '▸' : '▾'}</button>
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="inlineButton"
              onClick={handleTrigger}
              disabled={triggering}
              style={{ background: '#3182ce', color: '#fff', fontWeight: 600 }}
            >
              {triggering ? 'Creating backup…' : '💾 Back Up Now'}
            </button>
            <span style={{ fontSize: '0.8rem', color: '#718096' }}>
              Automatic daily backup runs at 02:00 · Keeps last 30 copies
            </span>
          </div>

          {message && (
            <div style={{
              marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem',
              background: message.type === 'success' ? '#f0fff4' : '#fff5f5',
              color: message.type === 'success' ? '#276749' : '#c53030',
              border: `1px solid ${message.type === 'success' ? '#c6f6d5' : '#fed7d7'}`,
            }}>
              {message.text}
            </div>
          )}

          {loading ? (
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>Loading backups…</p>
          ) : backups.length === 0 ? (
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>No backups yet. Click "Back Up Now" to create one.</p>
          ) : (
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', color: '#718096', fontWeight: 600 }}>File</th>
                  <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', color: '#718096', fontWeight: 600 }}>Created</th>
                  <th style={{ textAlign: 'right', padding: '0.35rem 0.5rem', color: '#718096', fontWeight: 600 }}>Size</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b, i) => (
                  <tr key={b.filename} style={{ borderBottom: '1px solid #f7fafc', background: i === 0 ? '#f0fff4' : 'transparent' }}>
                    <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'monospace', color: '#2d3748' }}>
                      {i === 0 && <span style={{ fontSize: '0.7rem', background: '#c6f6d5', color: '#276749', borderRadius: '3px', padding: '0.1rem 0.3rem', marginRight: '0.4rem', fontFamily: 'sans-serif', fontWeight: 600 }}>latest</span>}
                      {b.filename}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#4a5568' }}>{fmt(b.created_at)}</td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#4a5568', textAlign: 'right' }}>{b.size_kb} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
