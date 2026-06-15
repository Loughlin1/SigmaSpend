// src/components/BankAccountForm.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import '../styles/forms.css'

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
            onChange={(e) => setBankName(e.target.value)}
            required
            aria-label="Bank Name"
            className="form-inline-input"
          >
            <option value="" disabled>Select a bank</option>
            <option value="Lloyds Bank">Lloyds Bank</option>
            <option value="Halifax">Halifax</option>
            <option value="Bank of Scotland">Bank of Scotland</option>
            <option value="NatWest">NatWest</option>
            <option value="Royal Bank of Scotland (RBS)">Royal Bank of Scotland (RBS)</option>
            <option value="Ulster Bank">Ulster Bank</option>
            <option value="Barclays">Barclays</option>
            <option value="HSBC">HSBC</option>
            <option value="First Direct">First Direct</option>
            <option value="Nationwide Building Society">Nationwide Building Society</option>
            <option value="Santander">Santander</option>
            <option value="Cater Allen">Cater Allen</option>
            <option value="Virgin Money">Virgin Money</option>
            <option value="Clydesdale Bank">Clydesdale Bank</option>
            <option value="Yorkshire Bank">Yorkshire Bank</option>
            <option value="TSB">TSB</option>
            <option value="The Co-operative Bank">The Co-operative Bank</option>
            <option value="Metro Bank">Metro Bank</option>
            <option value="Monzo">Monzo</option>
            <option value="Starling Bank">Starling Bank</option>
            <option value="Revolut">Revolut</option>
            <option value="Chase UK">Chase UK</option>
            <option value="Kroo">Kroo</option>
            <option value="Atom Bank">Atom Bank</option>
            <option value="Zopa">Zopa</option>
            <option value="Tesco Bank">Tesco Bank</option>
            <option value="M&S Bank">M&S Bank</option>
            <option value="Danske Bank">Danske Bank</option>
            <option value="Bank of Ireland UK">Bank of Ireland UK</option>
            <option value="Allied Irish Bank (GB)">Allied Irish Bank (GB)</option>
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
