// src/components/StatementUpload.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import './StatementUpload.css';

export default function StatementUpload({ accounts, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (files.length === 0 || !selectedAccount) {
      setError('Please select a bank account and attach at least one CSV file.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const summary = await ingestionApi.uploadStatement(files, selectedAccount);
      alert(`Imported ${summary.summary?.added ?? 0} new records from ${files.length} file${files.length === 1 ? '' : 's'}!`);
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
            key={inputKey}
            type="file"
            accept=".csv"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="upload-box__file-input"
          />
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || !selectedAccount || loading}
            className="inlineButton upload-box__button"
          >
            {loading ? 'Processing...' : `Upload ${files.length === 0 ? '' : files.length} file${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
      {files.length > 0 && (
        <div className="upload-box__file-list">
          <strong>Selected files:</strong>
          {files.map((fileItem, index) => (
            <div key={`${fileItem.name}-${index}`} className="upload-box__file-item">
              {fileItem.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}