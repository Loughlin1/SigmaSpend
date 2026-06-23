// src/components/BankAccountList.jsx
import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import BankAccountForm from './BankAccountForm';

import '../styles/lists.css';


export default function BankAccountList({ accounts, loading, error, onAccountUpdated, onAccountCreated, showAccountForm, setShowAccountForm}) {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftDateColumn, setDraftDateColumn] = useState('');
  const [draftDescriptionColumn, setDraftDescriptionColumn] = useState('');
  const [draftAmountColumn, setDraftAmountColumn] = useState('');
  const [draftAmountOutColumn, setDraftAmountOutColumn] = useState('');
  const [draftAmountInColumn, setDraftAmountInColumn] = useState('');
  const [draftInvertAmounts, setDraftInvertAmounts] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // New state for collapsibility

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const startEditing = (account) => {
    setEditingAccountId(account.account_id);
    setDraftName(account.account_name || '');
    setDraftInvertAmounts(!!account.invert_amounts);
    const mappings = account.mappings || {};
    setDraftDateColumn(mappings.date_column || '');
    setDraftDescriptionColumn(mappings.description_column || '');
    setDraftAmountColumn(mappings.amount_column || '');
    setDraftAmountOutColumn(mappings.amount_out_column || '');
    setDraftAmountInColumn(mappings.amount_in_column || '');
    setSaveError('');
  };

  const cancelEditing = () => {
    setEditingAccountId(null);
    setDraftName('');
    setDraftDateColumn('');
    setDraftDescriptionColumn('');
    setDraftAmountColumn('');
    setDraftAmountOutColumn('');
    setDraftAmountInColumn('');
    setDraftInvertAmounts(false);
    setSaveError('');
  };

  const saveAccount = async () => {
    if (!draftName.trim()) {
      setSaveError('Account name cannot be empty.');
      return;
    }

    const mappings = {
      date_column: draftDateColumn.trim(),
      description_column: draftDescriptionColumn.trim(),
    };
    if (draftAmountColumn.trim()) {
      mappings.amount_column = draftAmountColumn.trim();
    }
    if (draftAmountOutColumn.trim()) {
      mappings.amount_out_column = draftAmountOutColumn.trim();
    }
    if (draftAmountInColumn.trim()) {
      mappings.amount_in_column = draftAmountInColumn.trim();
    }

    setSaving(true);
    setSaveError('');

    try {
      await ingestionApi.updateAccount(editingAccountId, {
        account_name: draftName.trim(),
        invert_amounts: draftInvertAmounts,
        mappings,
      });
      if (typeof onAccountUpdated === 'function') {
        await onAccountUpdated();
      }
      cancelEditing();
    } catch (err) {
      console.error('Failed updating bank account', err);
      setSaveError(err.response?.data?.detail || 'Unable to save bank account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-list">
      <div className="account-list__header" onClick={toggleCollapse}>
        <h3>Bank Accounts ({accounts.length})</h3>
        <button className="collapse-button">
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      {!isCollapsed && ( // Conditionally render content
        <>
          {error ? (
            <div className="account-list__error">{error}</div>
          ) : null}
          {loading ? (
            <div>Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div>No bank accounts found in the database.</div>
          ) : (
            <div className="account-list__wrapper">
              <table className="bank-account-table">
                <thead>
                  <tr>
                    {/* Explicitly bounding table layout allocations */}
                    <th className="table-header-cell" style={{ width: '20%', textAlign: 'left' }}>Account Name</th>
                    <th className="table-header-cell" style={{ width: '15%', textAlign: 'left' }}>Bank</th>
                    <th className="table-header-cell" style={{ width: '12%', textAlign: 'left' }}>Format</th>
                    <th className="table-header-cell" style={{ width: '15%', textAlign: 'left' }}>Invert Signs</th>
                    <th className="table-header-cell" style={{ width: '25%', textAlign: 'left' }}>Mappings</th>
                    <th className="table-header-cell" style={{ width: '13%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.account_id}>
                      {/* <td>{account.account_id}</td> */}
                      <td style={{ 
                        fontSize: '0.85rem', 
                        whiteSpace: 'normal',       // Overrides inherited 'nowrap' table behaviors
                        wordBreak: 'break-word',    // Splits long continuous string blocks if there are no spaces
                        minWidth: '120px',          // Prevents getting squished on smaller viewports 
                        maxWidth: '180px',          // Prevents expanding on wide displays
                        verticalAlign: 'top'
                      }}>
                        {editingAccountId === account.account_id ? (
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="form-inline-input"  /* Reuses your forms.css matching element metrics organically */
                            style={{ 
                              width: '100%', 
                              padding: '0.35rem', 
                              fontSize: '0.85rem',
                              margin: 0                     /* Reset default browser input spacing */
                            }}
                          />
                        ) : (
                          <strong style={{ color: '#2d3748' }}>{account.account_name}</strong>
                        )}
                      </td>
                      <td>{account.bank_name}</td>
                      <td>{account.amount_style}</td>
                      <td>
                        {editingAccountId === account.account_id ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={draftInvertAmounts}
                              onChange={(e) => setDraftInvertAmounts(e.target.checked)}
                            />
                            Credit Card Mode
                          </label>
                        ) : (
                          account.invert_amounts ? (
                            <span style={{ background: '#fff5f5', color: '#c53030', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #fed7d7' }}>
                              🔄 Inverted (Credit)
                            </span>
                          ) : (
                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Standard</span>
                          )
                        )}
                      </td>
                      <td style={{ 
                        fontSize: '0.85rem', 
                        whiteSpace: 'normal',     // Forces the text to break into new lines instead of staying on one line
                        wordBreak: 'break-word',  // Safely splits extremely long continuous strings if they have no spaces
                        minWidth: '180px',        // Prevents the column from getting too squished on mobile screens
                        maxWidth: '250px'         // Keeps it clean on larger viewports
                      }}>
                        {editingAccountId === account.account_id ? (
                          <div className="mapping-inputs">
                            <label>Date Column: <input type="text" value={draftDateColumn} onChange={(e) => setDraftDateColumn(e.target.value)} /></label>
                            <label>Description Column: <input type="text" value={draftDescriptionColumn} onChange={(e) => setDraftDescriptionColumn(e.target.value)} /></label>
                            {account.amount_style === 'single_column' ? (
                              <label>Amount Column: <input type="text" value={draftAmountColumn} onChange={(e) => setDraftAmountColumn(e.target.value)} /></label>
                            ) : (
                              <>
                                <label>Credit Column: <input type="text" value={draftAmountInColumn} onChange={(e) => setDraftAmountInColumn(e.target.value)} /></label>
                                <label>Debit Column: <input type="text" value={draftAmountOutColumn} onChange={(e) => setDraftAmountOutColumn(e.target.value)} /></label>
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            <div>Date: {account.mappings?.date_column}</div>
                            <div>Description: {account.mappings?.description_column}</div>
                            {account.amount_style === 'single_column' ? (
                              <div>Amount: {account.mappings?.amount_column}</div>
                            ) : (
                              <>
                                <div>Credit: {account.mappings?.amount_in_column}</div>
                                <div>Debit: {account.mappings?.amount_out_column}</div>
                              </>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        {editingAccountId === account.account_id ? (
                          <>
                            <button onClick={saveAccount} disabled={saving}>Save</button>
                            <button onClick={cancelEditing} disabled={saving}>Cancel</button>
                            {saveError && <div className="save-error">{saveError}</div>}
                          </>
                        ) : (
                          <button onClick={() => startEditing(account)}>Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="account-list__creation-zone" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
            <button 
              type="button" 
              onClick={() => setShowAccountForm((prev) => !prev)} 
              className="button"
              style={{ marginBottom: '15px' }}
            >
              {showAccountForm ? 'Hide Form' : 'Create New Bank Account'}
            </button>
            
            {showAccountForm && (
              <BankAccountForm onAccountCreated={onAccountCreated} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

