// src/components/StatementUpload.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';

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
    <div className="upload-box" style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', background: '#fff' }}>
      <h3>Import Bank Statement</h3>
      {error && <div style={{ color: '#cc0000', marginBottom: '0.75rem' }}>{error}</div>}
      <div style={{ display: 'flex'}}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '12px'}}>
          Select Bank Account
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            style={{ width: '80%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center'}}>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginTop: '0.75rem' }}
          />
          <button onClick={handleUpload} disabled={!file || !selectedAccount || loading} style={{ marginTop: '0.75rem', padding: '0.75rem 0.25rem' }}>
            {loading ? 'Processing...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}