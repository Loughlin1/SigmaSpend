import React, { useState } from 'react';
import { ingestionApi } from '../api/client';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

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
    <div className="account-list" style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', background: '#fff' }}>
      {error ? (
        <div style={{ color: '#cc0000', marginBottom: '1rem' }}>{error}</div>
      ) : null}
      {loading ? (
        <div>Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div>No bank accounts found in the database.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerCell}>Account ID</th>
              <th style={headerCell}>Account Name</th>
              <th style={headerCell}>Bank</th>
              <th style={headerCell}>Format</th>
              <th style={headerCell}>Profile</th>
              <th style={headerCell}>Active</th>
              <th style={headerCell}>Created</th>
              <th style={headerCell}>Date Column</th>
              <th style={headerCell}>Description Column</th>
              <th style={headerCell}>Amount Column</th>
              <th style={headerCell}>Debit Column</th>
              <th style={headerCell}>Credit Column</th>
              <th style={headerCell}>Actions</th>
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
                  <td style={bodyCell}>{account.account_id}</td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      account.account_name
                    )}
                  </td>
                  <td style={bodyCell}>{account.bank_name}</td>
                  <td style={bodyCell}>{account.amount_style}</td>
                  <td style={bodyCell}>{account.bank_profile || '-'}</td>
                  <td style={bodyCell}>{account.is_active ? 'Yes' : 'No'}</td>
                  <td style={bodyCell}>{formatDate(account.created_at)}</td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftDateColumn}
                        onChange={(e) => setDraftDateColumn(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      dateColumn
                    )}
                  </td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftDescriptionColumn}
                        onChange={(e) => setDraftDescriptionColumn(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      descriptionColumn
                    )}
                  </td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftAmountColumn}
                        onChange={(e) => setDraftAmountColumn(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      account.amount_style === 'single_column' ? amountColumn : '-'
                    )}
                  </td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftAmountOutColumn}
                        onChange={(e) => setDraftAmountOutColumn(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      account.amount_style === 'split_columns' ? amountOutColumn : '-'
                    )}
                  </td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftAmountInColumn}
                        onChange={(e) => setDraftAmountInColumn(e.target.value)}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    ) : (
                      account.amount_style === 'split_columns' ? amountInColumn : '-'
                    )}
                  </td>
                  <td style={bodyCell}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={saveAccount} disabled={saving} style={{ padding: '0.35rem 0.75rem' }}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEditing} disabled={saving} style={{ padding: '0.35rem 0.75rem' }}>
                          Cancel
                        </button>
                        {saveError && <div style={{ color: '#cc0000', marginTop: '0.25rem' }}>{saveError}</div>}
                      </div>
                    ) : (
                      <button type="button" onClick={() => startEditing(account)} style={{ padding: '0.35rem 0.75rem' }}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const headerCell = {
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  padding: '0.5rem',
};

const bodyCell = {
  padding: '0.5rem',
  borderBottom: '1px solid #f0f0f0',
  verticalAlign: 'top',
};
