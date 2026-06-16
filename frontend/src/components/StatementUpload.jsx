// src/components/StatementUpload.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import '../styles/forms.css';

export default function StatementUpload({ accounts, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault(); // Preventing submission bubbling transitions
    if (files.length === 0 || !selectedAccount) {
      setError('Please select a bank account and attach at least one CSV file.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const response = await ingestionApi.uploadStatement(files, selectedAccount);
      const metrics = response.summary || response.data || response;

      const added = metrics.added ?? 0;
      const skipped = metrics.skipped ?? 0;
      const categorized = metrics.categorized ?? 0;
      const uncategorized = metrics.uncategorized ?? 0;
      console.log("[SigmaSpend UI] Statement Ingestion Success Metrics:", {
        total_files: files.length,
        added,
        skipped,
        categorized,
        uncategorized
      });
      alert(
        `Import complete for ${files.length} file${files.length === 1 ? '' : 's'}!\n\n` +
        `• New Transactions Added: ${added}\n` +
        `• Duplicates Skipped: ${skipped}\n` +
        `• Automatically Categorised: ${categorized} ✨\n` +
        `• Left Uncategorised: ${uncategorized} ❓`
      );
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
    <section className="form">
      <h3>Import Bank Statement</h3>
      {error && <div className="form__error">{error}</div>}
      
      <form onSubmit={handleUpload} className="form__grid">
        <label className="form-field-wrapper">
          Select Bank Account
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="form-inline-input"
            required
          >
            <option value="">Choose an account</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} ({account.bank_name})
              </option>
            ))}
          </select>
        </label>

        <label className="form-field-wrapper">
          Attach Statement Files (.csv)
          <input
            key={inputKey}
            type="file"
            accept=".csv"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="form-inline-input"
            style={{ padding: '0.35rem' }} // Slight vertical normalization for file selector boxes
          />
        </label>

        {files.length > 0 && (
          <div style={{ gridColumn: '1 / -1', width: '100%', fontSize: '0.9rem', color: '#555', background: '#f7f7f7', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #eee' }}>
            <strong>Selected files ({files.length}):</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
              {files.map((fileItem, index) => (
                <li key={`${fileItem.name}-${index}`} style={{ fontFamily: 'monospace' }}>
                  {fileItem.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={files.length === 0 || !selectedAccount || loading}
          className="inlineButton form__submit"
          style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }} // Centers button across the grid layout width
        >
          {loading ? 'Processing...' : `Upload File${files.length === 1 ? '' : 's'}`}
        </button>
      </form>
    </section>
  );
}