// src/features/ledger/components/LedgerTable/LedgerRowRead.jsx
import React from 'react';

export default function LedgerRowRead({ 
  expense, 
  isChecked, 
  onSelectRow, 
  displayAccountName, 
  displayCategory, 
  onStartEdit, 
  onDelete 
}) {
  return (
    <tr style={{ background: isChecked ? '#f7fafc' : 'transparent' }}>
      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
        <input type="checkbox" checked={isChecked} onChange={onSelectRow} />
      </td>
      <td className="ledger-table-date" style={{ fontSize: '0.85rem' }}>{expense.date}</td>
      <td style={{ fontSize: '0.85rem' }}>{expense.description}</td>
      <td style={{ fontSize: '0.85rem' }}>{displayAccountName}</td>
      <td style={{ fontSize: '0.85rem' }}>{displayCategory.icon} {displayCategory.name}</td>
      <td style={{ fontSize: '0.85rem' }}>{expense.notes || <span style={{ color: '#ccc' }}>—</span>}</td>
      <td style={{ fontSize: '0.85rem' }}>{expense.is_income ? 'Income' : 'Expense'}</td>
      <td className="ledger-table-amount" style={{ color: expense.is_income ? '#22543d' : '#2d3748', fontSize: '0.85rem' }}>
        £{Number(expense.amount).toFixed(2)}
      </td>
      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', fontSize: '0.85rem' }}>
          <button type="button" onClick={onStartEdit} className="inlineButton table-icon-btn" title="Edit Transaction">✏️</button>
          <button type="button" onClick={() => onDelete && onDelete(expense.id)} className="inlineButton table-icon-btn table-icon-btn--delete" style={{ background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }} title="Delete Transaction">🗑️</button>
        </div>
      </td>
    </tr>
  );
}