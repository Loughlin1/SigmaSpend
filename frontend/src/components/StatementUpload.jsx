// src/components/StatementUpload.jsx
import { useState } from 'react';
import { ingestionApi } from '../api/client';
import MetricsModal from './ui/MetricsModal';
import '../styles/forms.css';

export default function StatementUpload({ accounts, onUploadSuccess, className = '' }) {
  const [files, setFiles] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [showMetrics, setShowMetrics] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadMetrics, setUploadMetrics] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (files.length === 0 || !selectedAccount) return;

    setError('');
    setLoading(true);
    setTouched(false);
    const fileCountSent = files.length;

    console.log('[Upload] Starting upload, account:', selectedAccount, 'files:', files.map(f => f.name));
    try {
      const response = await ingestionApi.uploadStatement(files, selectedAccount);
      console.log('[Upload] Response:', response);
      const metrics = response.summary || response.data || response;

      setUploadMetrics({
        added: metrics.added ?? 0,
        skipped: metrics.skipped ?? 0,
        categorized: metrics.categorized ?? 0,
        uncategorized: metrics.uncategorized ?? 0,
        errors: metrics.errors ?? 0,
      });
      setUploadedFileCount(fileCountSent);
      setShowMetrics(true);

      onUploadSuccess();
      setFiles([]);
      setInputKey((prev) => prev + 1);
    } catch (err) {
      console.error('[Upload] Failed:', err);
      const detail = err.response?.data?.detail
        || err.response?.data?.message
        || err.message
        || 'Failed to upload statement.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`sectionCard ${className}`}>
      <div
        className="account-list__header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: 'pointer' }}
      >
        <h2 style={{ margin: 0 }}>Import Bank Statement</h2>
        <button className="collapse-button">{isCollapsed ? '▸' : '▾'}</button>
      </div>

      {!isCollapsed && (
        <div style={{ marginTop: '1rem' }}>
          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <select
                value={selectedAccount}
                onChange={(e) => { setSelectedAccount(e.target.value); setTouched(false); }}
                className="inlineButton"
                style={{ minWidth: '200px', borderColor: touched && !selectedAccount ? '#e53e3e' : '' }}
              >
                <option value="">Select account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.bank_name})
                  </option>
                ))}
              </select>
              {touched && !selectedAccount && (
                <span style={{ fontSize: '0.75rem', color: '#e53e3e' }}>Please select an account</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '180px' }}>
              <input
                key={inputKey}
                type="file"
                accept=".csv,.pdf"
                multiple
                onChange={(e) => { setFiles(Array.from(e.target.files)); setTouched(false); }}
                className="inlineButton"
                style={{ padding: '0.3rem', borderColor: touched && files.length === 0 ? '#e53e3e' : '' }}
              />
              {touched && files.length === 0 && (
                <span style={{ fontSize: '0.75rem', color: '#e53e3e' }}>Please select at least one file</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inlineButton form__submit"
            >
              {loading ? 'Processing...' : `Upload${files.length > 1 ? ` (${files.length})` : ''}`}
            </button>
          </form>
          {error && <div className="form__error" style={{ marginTop: '0.75rem' }}>{error}</div>}
        </div>
      )}

      <MetricsModal
        isOpen={showMetrics}
        onClose={() => setShowMetrics(false)}
        fileCount={uploadedFileCount}
        metrics={uploadMetrics}
      />
    </section>
  );
}
