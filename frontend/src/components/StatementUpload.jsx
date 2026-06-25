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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [showMetrics, setShowMetrics] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadMetrics, setUploadMetrics] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !selectedAccount) {
      setError('Please select a bank account and attach at least one file.');
      return;
    }

    setError('');
    setLoading(true);
    const fileCountSent = files.length;

    try {
      const response = await ingestionApi.uploadStatement(files, selectedAccount);
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
      console.error('Upload failed', err);
      setError(err.response?.data?.detail || 'Failed to upload statement.');
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
          {error && <div className="form__error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="inlineButton"
              required
              style={{ minWidth: '200px' }}
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name} ({account.bank_name})
                </option>
              ))}
            </select>

            <input
              key={inputKey}
              type="file"
              accept=".csv,.pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="inlineButton"
              style={{ padding: '0.3rem', flex: 1, minWidth: '180px' }}
            />

            <button
              type="submit"
              disabled={files.length === 0 || !selectedAccount || loading}
              className="inlineButton form__submit"
            >
              {loading ? 'Processing...' : `Upload${files.length > 1 ? ` (${files.length})` : ''}`}
            </button>
          </form>
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
