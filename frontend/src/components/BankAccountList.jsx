import React, { useState } from 'react';
import { ingestionApi } from '../api/client';
import './BankAccountList.css';


export default function BankAccountList({ accounts, loading, error, onAccountUpdated }) {
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftDateColumn, setDraftDateColumn] = useState('');
  const [draftDescriptionColumn, setDraftDescriptionColumn] = useState('');
  const [draftAmountColumn, setDraftAmountColumn] = useState('');
  const [draftAmountOutColumn, setDraftAmountOutColumn] = useState('');
  const [draftAmountInColumn, setDraftAmountInColumn] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

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
            {accounts.map((account) => {
              const isEditing = editingAccountId === account.account_id;
              const mappings = account.mappings || {};
              const dateColumn = mappings.date_column || '-';
              const descriptionColumn = mappings.description_column || '-';
              const amountColumn = mappings.amount_column || '-';
              const amountOutColumn = mappings.amount_out_column || '-';
              const amountInColumn = mappings.amount_in_column || '-';
              return (
                <tr key={account.account_id}>
                  <td className="table-cell">{account.account_id}</td>
                  <td className="table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="inline-input"
                      />
                    ) : (
                      account.account_name
                    )}
                  </td>
                  <td className="table-cell">{account.bank_name}</td>
                  <td className="table-cell">{account.amount_style}</td>
                  <td className="table-cell mapping-cell">
                    {isEditing ? (
                      <div className="mapping-details">
                        <div className="mapping-row">
                          <label>Date</label>
                          <input
                            type="text"
                            value={draftDateColumn}
                            onChange={(e) => setDraftDateColumn(e.target.value)}
                            className="inline-input"
                          />
                        </div>
                        <div className="mapping-row">
                          <label>Desc</label>
                          <input
                            type="text"
                            value={draftDescriptionColumn}
                            onChange={(e) => setDraftDescriptionColumn(e.target.value)}
                            className="inline-input"
                          />
                        </div>
                        {account.amount_style === 'single_column' ? (
                          <div className="mapping-row">
                            <label>Amount</label>
                            <input
                              type="text"
                              value={draftAmountColumn}
                              onChange={(e) => setDraftAmountColumn(e.target.value)}
                              className="inline-input"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="mapping-row">
                              <label>Debit</label>
                              <input
                                type="text"
                                value={draftAmountOutColumn}
                                onChange={(e) => setDraftAmountOutColumn(e.target.value)}
                                className="inline-input"
                              />
                            </div>
                            <div className="mapping-row">
                              <label>Credit</label>
                              <input
                                type="text"
                                value={draftAmountInColumn}
                                onChange={(e) => setDraftAmountInColumn(e.target.value)}
                                className="inline-input"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mapping-details">
                        <div><strong>Date:</strong> {dateColumn}</div>
                        <div><strong>Desc:</strong> {descriptionColumn}</div>
                        {account.amount_style === 'single_column' ? (
                          <div><strong>Amount:</strong> {amountColumn}</div>
                        ) : (
                          <>
                            <div><strong>Debit:</strong> {amountOutColumn}</div>
                            <div><strong>Credit:</strong> {amountInColumn}</div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="table-cell actions-cell">
                    {isEditing ? (
                      <div className="action-buttons">
                        <button type="button" onClick={saveAccount} disabled={saving} className="inlineButton">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEditing} disabled={saving} className="inlineButton">
                          Cancel
                        </button>
                        {saveError && <div className="error-text">{saveError}</div>}
                      </div>
                    ) : (
                      <button type="button" onClick={() => startEditing(account)} className="inlineButton">
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

