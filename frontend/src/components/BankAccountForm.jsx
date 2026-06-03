import React, { useState } from 'react';
import { ingestionApi } from '../api/client';

export default function BankAccountForm({ onAccountCreated }) {
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [amountStyle, setAmountStyle] = useState('single_column');
  const [dateColumn, setDateColumn] = useState('Date');
  const [descriptionColumn, setDescriptionColumn] = useState('Description');
  const [amountColumn, setAmountColumn] = useState('Amount');
  const [amountInColumn, setAmountInColumn] = useState('Credit');
  const [amountOutColumn, setAmountOutColumn] = useState('Debit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const buildMappings = () => {
    const mappings = {
      date_column: dateColumn.trim(),
      description_column: descriptionColumn.trim(),
    };

    if (amountStyle === 'single_column') {
      mappings.amount_column = amountColumn.trim();
    } else {
      mappings.amount_out_column = amountOutColumn.trim();
      mappings.amount_in_column = amountInColumn.trim();
    }

    return mappings;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!accountId.trim() || !accountName.trim() || !bankName.trim()) {
      setError('Account ID, name, and bank name are required.');
      return;
    }

    const mappings = buildMappings();
    if (!mappings.date_column || !mappings.description_column) {
      setError('Date and description columns are required.');
      return;
    }

    if (amountStyle === 'single_column' && !mappings.amount_column) {
      setError('Amount column is required for single-column bank statements.');
      return;
    }

    if (amountStyle === 'split_columns' && (!mappings.amount_in_column || !mappings.amount_out_column)) {
      setError('Both credit and debit columns are required for split-column statements.');
      return;
    }

    setLoading(true);
    try {
      await ingestionApi.createAccount({
        account_id: accountId.trim(),
        account_name: accountName.trim(),
        bank_name: bankName.trim(),
        amount_style: amountStyle,
        mappings,
      });
      setSuccessMessage('Bank account added successfully.');
      setAccountId('');
      setAccountName('');
      setBankName('');
      setAmountStyle('single_column');
      setDateColumn('Date');
      setDescriptionColumn('Description');
      setAmountColumn('Amount');
      setAmountInColumn('Credit');
      setAmountOutColumn('Debit');
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
        <label>
          Bank Name
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. Chase Bank"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        <label>
          Statement Format
          <select
            value={amountStyle}
            onChange={(e) => setAmountStyle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="single_column">Single Column</option>
            <option value="split_columns">Split Columns</option>
          </select>
        </label>
        <label>
          Date Column
          <input
            type="text"
            value={dateColumn}
            onChange={(e) => setDateColumn(e.target.value)}
            placeholder="e.g. Date"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        <label>
          Description Column
          <input
            type="text"
            value={descriptionColumn}
            onChange={(e) => setDescriptionColumn(e.target.value)}
            placeholder="e.g. Description"
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </label>
        {amountStyle === 'single_column' ? (
          <label>
            Amount Column
            <input
              type="text"
              value={amountColumn}
              onChange={(e) => setAmountColumn(e.target.value)}
              placeholder="e.g. Amount"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
        ) : (
          <>
            <label>
              Debit Column
              <input
                type="text"
                value={amountOutColumn}
                onChange={(e) => setAmountOutColumn(e.target.value)}
                placeholder="e.g. Debit"
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </label>
            <label>
              Credit Column
              <input
                type="text"
                value={amountInColumn}
                onChange={(e) => setAmountInColumn(e.target.value)}
                placeholder="e.g. Credit"
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </label>
          </>
        )}
        <button type="submit" disabled={loading} style={{ padding: '0.75rem 1rem' }}>
          {loading ? 'Saving...' : 'Add Bank Account'}
        </button>
      </form>
    </section>
  );
}
