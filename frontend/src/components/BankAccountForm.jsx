import React, { useState } from 'react';
import { ingestionApi } from '../api/client';

export default function BankAccountForm({ onAccountCreated }) {
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!accountId.trim() || !accountName.trim()) {
      setError('Both account ID and name are required.');
      return;
    }

    setLoading(true);
    try {
      await ingestionApi.createAccount({ account_id: accountId.trim(), account_name: accountName.trim() });
      setSuccessMessage('Bank account added successfully.');
      setAccountId('');
      setAccountName('');
      onAccountCreated();
    } catch (err) {
      console.error('Failed creating bank account', err);
      setError(err.response?.data?.detail || 'Could not create bank account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', background: '#fff' }}>
      <h3>Create New Bank Account</h3>
      {error && <div style={{ color: '#cc0000', marginBottom: '0.75rem' }}>{error}</div>}
      {successMessage && <div style={{ color: '#006600', marginBottom: '0.75rem' }}>{successMessage}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <label>
          Account ID
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="e.g. checking_001"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        <label>
          Account Name
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. My Checking Account"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1rem' }}>
          {loading ? 'Saving...' : 'Add Bank Account'}
        </button>
      </form>
    </section>
  );
}
