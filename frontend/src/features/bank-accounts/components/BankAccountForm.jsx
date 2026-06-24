// src/features/bank-accounts/components/BankAccountForm.jsx
import React, { useState } from 'react';
import { accountsApi } from '../../../api/client';
import useBanks from '../hooks/useBanks';
import '../../../styles/forms.css'

export default function BankAccountForm({ onAccountCreated }) {
  const { banks, loading: banksLoading } = useBanks();

  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [amountStyle, setAmountStyle] = useState('single_column');
  const [dateColumn, setDateColumn] = useState('Date');
  const [descriptionColumn, setDescriptionColumn] = useState('Description');
  const [amountColumn, setAmountColumn] = useState('Amount');
  const [amountInColumn, setAmountInColumn] = useState('Credit');
  const [amountOutColumn, setAmountOutColumn] = useState('Debit');
  const [invertAmounts, setInvertAmounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleBankSelect = (selectedName) => {
    setBankName(selectedName);
    const profile = banks.find(b => b.name === selectedName);
    if (!profile) return;
    if (profile.default_amount_style) setAmountStyle(profile.default_amount_style);
    if (profile.default_invert_amounts != null) setInvertAmounts(profile.default_invert_amounts);
    if (profile.default_mappings) {
      const m = profile.default_mappings;
      if (m.date_column) setDateColumn(m.date_column);
      if (m.description_column) setDescriptionColumn(m.description_column);
      if (m.amount_column) setAmountColumn(m.amount_column);
      if (m.amount_in_column) setAmountInColumn(m.amount_in_column);
      if (m.amount_out_column) setAmountOutColumn(m.amount_out_column);
    }
  };

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
      await accountsApi.createAccount({
        account_id: accountId.trim(),
        account_name: accountName.trim(),
        bank_name: bankName.trim(),
        amount_style: amountStyle,
        invert_amounts: invertAmounts,
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
      setInvertAmounts(false);
      onAccountCreated();
    } catch (err) {
      console.error('Failed creating bank account', err);
      setError(err.response?.data?.detail || 'Could not create bank account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="form">
      <h3>Create New Bank Account</h3>
      {error && <div className="form__error">{error}</div>}
      {successMessage && <div className="form__success">{successMessage}</div>}
      <form onSubmit={handleSubmit} className="form__grid">
        <label className="form-field-wrapper">
          Account ID
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="e.g. checking_001"
            className="form-inline-input"
          />
        </label>
        <label className="form-field-wrapper">
          Account Name
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. My Checking Account"
            className="form-inline-input"
          />
        </label>
        <label className="form-field-wrapper">
          Bank Name
          <select
            value={bankName}
            onChange={(e) => handleBankSelect(e.target.value)}
            required
            aria-label="Bank Name"
            className="form-inline-input"
            disabled={banksLoading}
          >
            <option value="" disabled>{banksLoading ? 'Loading banks...' : 'Select a bank'}</option>
            {banks.map(b => (
              <option key={b.name} value={b.name}>
                {b.name}{b.default_mappings ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field-wrapper">
          Statement Format
          <select
            value={amountStyle}
            onChange={(e) => setAmountStyle(e.target.value)}
            className="form-inline-input"
          >
            <option value="single_column">Single Column</option>
            <option value="split_columns">Split Columns</option>
          </select>
        </label>

        <div className="form-field-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: '500' }}>Invert Signs</span>
            <div
              className="custom-tooltip"
              data-tooltip="Enable this for credit card statements where positive charges represent expenses/debt and negative lines represent paying off your card balance (income)."
              style={{
                position: 'relative', display: 'inline-block', cursor: 'help',
                background: '#e2e8f0', borderRadius: '50%', width: '16px', height: '16px',
                textAlign: 'center', fontSize: '0.7rem', lineHeight: '16px', fontWeight: 'bold', color: '#4a5568'
              }}
            >
              ?
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.4rem', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={invertAmounts}
              onChange={(e) => setInvertAmounts(e.target.checked)}
            />
            Credit Card Mode
          </label>
        </div>

        <label className="form-field-wrapper">
          Date Column
          <input
            type="text"
            value={dateColumn}
            onChange={(e) => setDateColumn(e.target.value)}
            placeholder="e.g. Date"
            className="form-inline-input"
          />
        </label>
        <label className="form-field-wrapper">
          Description Column
          <input
            type="text"
            value={descriptionColumn}
            onChange={(e) => setDescriptionColumn(e.target.value)}
            placeholder="e.g. Description"
            className="form-inline-input"
          />
        </label>
        {amountStyle === 'single_column' ? (
          <label className="form-field-wrapper">
            Amount Column
            <input
              type="text"
              value={amountColumn}
              onChange={(e) => setAmountColumn(e.target.value)}
              placeholder="e.g. Amount"
              className="form-inline-input"
            />
          </label>
        ) : (
          <>
            <label className="form-field-wrapper">
              Debit Column
              <input
                type="text"
                value={amountOutColumn}
                onChange={(e) => setAmountOutColumn(e.target.value)}
                placeholder="e.g. Debit"
                className="form-inline-input"
              />
            </label>
            <label className="form-field-wrapper">
              Credit Column
              <input
                type="text"
                value={amountInColumn}
                onChange={(e) => setAmountInColumn(e.target.value)}
                placeholder="e.g. Credit"
                className="form-inline-input"
              />
            </label>
          </>
        )}
        <div className="form-field-wrapper"></div>
        <div className="form-field-wrapper">
          <button type="submit" disabled={loading} className="inlineButton form__submit">
            {loading ? 'Saving...' : 'Add Bank Account'}
          </button>
        </div>
      </form>
    </section>
  );
}
