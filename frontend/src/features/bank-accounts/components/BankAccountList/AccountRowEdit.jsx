// src/features/bank-accounts/components/BankAccountList/AccountRowEdit.jsx
import { useState } from 'react';
import { accountsApi } from '../../../../api/client';

export default function AccountRowEdit({ account, onAccountUpdated, onCancel }) {
  const [draftName, setDraftName] = useState(account.account_name || '');
  const [draftInvertAmounts, setDraftInvertAmounts] = useState(!!account.invert_amounts);
  
  const mappings = account.mappings || {};
  const [draftDateColumn, setDraftDateColumn] = useState(mappings.date_column || '');
  const [draftDescriptionColumn, setDraftDescriptionColumn] = useState(mappings.description_column || '');
  const [draftAmountColumn, setDraftAmountColumn] = useState(mappings.amount_column || '');
  const [draftAmountOutColumn, setDraftAmountOutColumn] = useState(mappings.amount_out_column || '');
  const [draftAmountInColumn, setDraftAmountInColumn] = useState(mappings.amount_in_column || '');
  const [draftPdfRegex, setDraftPdfRegex] = useState(mappings.pdf_regex || '');
  const [draftPdfHeaderBypass, setDraftPdfHeaderBypass] = useState(mappings.pdf_header_bypass || '');
  
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!draftName.trim()) {
      setSaveError('Account name cannot be empty.');
      return;
    }

    const updatedMappings = {
      date_column: draftDateColumn.trim(),
      description_column: draftDescriptionColumn.trim(),
    };
    if (draftAmountColumn.trim()) updatedMappings.amount_column = draftAmountColumn.trim();
    if (draftAmountOutColumn.trim()) updatedMappings.amount_out_column = draftAmountOutColumn.trim();
    if (draftAmountInColumn.trim()) updatedMappings.amount_in_column = draftAmountInColumn.trim();
    if (draftPdfRegex.trim()) updatedMappings.pdf_regex = draftPdfRegex.trim();
    if (draftPdfHeaderBypass.trim()) updatedMappings.pdf_header_bypass = draftPdfHeaderBypass.trim();

    setSaving(true);
    setSaveError('');

    try {
      await accountsApi.updateAccount(account.account_id, {
        account_name: draftName.trim(),
        invert_amounts: draftInvertAmounts,
        mappings: updatedMappings,
      });
      if (typeof onAccountUpdated === 'function') {
        await onAccountUpdated();
      }
      onCancel();
    } catch (err) {
      console.error('Failed updating bank account', err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setSaveError(detail.map(e => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join(' | '));
      } else {
        setSaveError(detail || err.message || 'Unable to save bank account.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr style={{ background: '#f7fafc' }}>
      <td style={{ verticalAlign: 'top' }}>
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className="form-inline-input"
          style={{ width: '100%', padding: '0.35rem', fontSize: '0.85rem', margin: 0 }}
        />
      </td>
      <td>{account.bank_name}</td>
      <td>{account.amount_style}</td>
      <td>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={draftInvertAmounts}
            onChange={(e) => setDraftInvertAmounts(e.target.checked)}
          />
          Credit Card Mode
        </label>
      </td>
      <td style={{ fontSize: '0.85rem', whiteSpace: 'normal', wordBreak: 'break-word', minWidth: '180px', maxWidth: '250px' }}>
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
          <label style={{ display: 'block' }}>
            PDF Regex:
            <textarea
              value={draftPdfRegex}
              onChange={(e) => setDraftPdfRegex(e.target.value)}
              rows={3}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.2rem', resize: 'vertical' }}
              placeholder="^(?:\\d+\\s+)?..."
            />
          </label>
          <label>
            PDF Header Bypass:
            <input
              type="text"
              value={draftPdfHeaderBypass}
              onChange={(e) => setDraftPdfHeaderBypass(e.target.value)}
              placeholder="date of transaction,page"
            />
          </label>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button onClick={handleSave} disabled={saving}>Save</button>
          <button onClick={onCancel} disabled={saving}>Cancel</button>
          {saveError && <div className="save-error" style={{ color: '#c53030', fontSize: '0.75rem' }}>{saveError}</div>}
        </div>
      </td>
    </tr>
  );
}