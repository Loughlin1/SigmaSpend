// src/components/StatementUpload.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import './StatementUpload.css';

export default function StatementUpload({ accounts, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file || !selectedAccount) {
      setError('Please select a bank account and attach a CSV file.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const summary = await ingestionApi.uploadStatement(file, selectedAccount);
      alert(`Imported ${summary.summary?.added ?? 0} new records!`);
      onUploadSuccess();
      setFile(null);
    } catch (err) {
      console.error('Upload failed', err);
      setError(err.response?.data?.detail || 'Failed to upload statement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box sectionCard">
      <h3>Import Bank Statement</h3>
      {error && <div className="upload-box__error">{error}</div>}
      <div className="upload-box__row">
        <div className="upload-box__field">
          <label className="upload-box__label">
            Select Bank Account
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="upload-box__select"
            >
            <option value="">Choose an account</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.account_name} ({account.bank_name})
              </option>
            ))}
          </select>
        </label>
        </div>
        <div className="upload-box__actions">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="upload-box__file-input"
          />
          <button onClick={handleUpload} disabled={!file || !selectedAccount || loading} className="inlineButton upload-box__button">
            {loading ? 'Processing...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}