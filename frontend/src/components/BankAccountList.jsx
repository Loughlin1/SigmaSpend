import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import BankAccountForm from './BankAccountForm';

import './BankAccountList.css';


export default function BankAccountList({ accounts, loading, error, onAccountUpdated, onAccountCreated, showAccountForm, setShowAccountForm}) {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftDateColumn, setDraftDateColumn] = useState('');
  const [draftDescriptionColumn, setDraftDescriptionColumn] = useState('');
  const [draftAmountColumn, setDraftAmountColumn] = useState('');
  const [draftAmountOutColumn, setDraftAmountOutColumn] = useState('');
  const [draftAmountInColumn, setDraftAmountInColumn] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true); // New state for collapsibility

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const startEditing = (account) => {
    setEditingAccountId(account.account_id);
    setDraftName(account.account_name || '');
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
                    <th className="table-header-cell">Account ID</th>
                    <th className="table-header-cell">Account Name</th>
                    <th className="table-header-cell">Bank</th>
                    <th className="table-header-cell">Format</th>
                    <th className="table-header-cell">Mappings</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.account_id}>
                      <td>{account.account_id}</td>
                      <td>
                        {editingAccountId === account.account_id ? (
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                          />
                        ) : (
                          account.account_name
                        )}
                      </td>
                      <td>{account.bank_name}</td>
                      <td>{account.amount_style}</td>
                      <td>
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

