// src/features/ledger/components/LedgerTable/LedgerRowRead.jsx

import { formatTransactionDate, getGoogleCalendarDayUrl, getGmailReceiptSearchUrl } from '../../../../utils/calendarUtils';

function parseDMY(str) {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  return new Date(`${y}-${m}-${d}`);
}

export default function LedgerRowRead({
  expense,
  isChecked,
  onSelectRow,
  displayAccountName,
  displayCategory,
  onStartEdit,
  onDelete,
  onRowClick,
  rowPadding = '0.75rem 1rem',
  holidays = [],
}) {
  const tdStyle = { fontSize: '0.85rem', padding: rowPadding, cursor: 'pointer' };

  // Find a holiday whose date range covers this expense, only if not already assigned
  const expDate = parseDMY(expense.date);
  const suggestedHoliday = !expense.holiday_id && expDate
    ? holidays.find(h => {
        if (!h.start_date || !h.end_date) return false;
        const start = new Date(h.start_date);
        const end = new Date(h.end_date);
        return expDate >= start && expDate <= end;
      })
    : null;
  const assignedHoliday = expense.holiday_id ? holidays.find(h => h.id === expense.holiday_id) : null;

  return (
    <tr style={{ background: isChecked ? '#f7fafc' : 'transparent' }}>
      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: rowPadding }}>
        <input type="checkbox" checked={isChecked} onChange={onSelectRow} />
      </td>
      <td className="ledger-table-date" style={tdStyle}>
        <span>{formatTransactionDate(expense.date)}</span>
        <a
          href={getGoogleCalendarDayUrl(expense.date)}
          target="_blank"
          rel="noopener noreferrer"
          className="calendar-icon-btn"
          title="View in Google Calendar"
          style={{ marginLeft: '6px', textDecoration: 'none' }}
        >
          📅
        </a>
        <a
          href={getGmailReceiptSearchUrl(expense.date, expense.description)}
          target="_blank"
          rel="noopener noreferrer"
          className="calendar-icon-btn"
          title="Search Gmail for receipts"
          style={{ marginLeft: '4px', textDecoration: 'none' }}
        >
          ✉️
        </a>
      </td>
      <td
        style={{ ...tdStyle, textDecoration: 'underline dotted', textDecorationColor: '#cbd5e0' }}
        onClick={() => onRowClick && onRowClick(expense)}
        title="Click to view details"
      >
        {expense.description}
        {expense.holiday_name && (
          <span title={expense.holiday_name} style={{ marginLeft: '0.4rem', fontSize: '0.72rem', background: '#ebf8ff', color: '#2b6cb0', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {assignedHoliday?.flag || '✈️'} {expense.holiday_name}
          </span>
        )}
        {suggestedHoliday && (
          <span
            title={`Date falls within "${suggestedHoliday.name}" — click to assign`}
            onClick={() => onRowClick && onRowClick(expense)}
            style={{ marginLeft: '0.4rem', fontSize: '0.72rem', background: '#fffff0', color: '#b7791f', border: '1px dashed #f6e05e', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer' }}
          >
            {suggestedHoliday.flag || '✈️'} {suggestedHoliday.name}?
          </span>
        )}
      </td>
      <td style={tdStyle}>{displayAccountName}</td>
      <td style={tdStyle}>{displayCategory.icon} {displayCategory.name}</td>
      <td style={tdStyle}>{expense.notes || <span style={{ color: '#ccc' }}>—</span>}</td>
      <td style={tdStyle}>{expense.is_income ? 'Income' : 'Expense'}</td>
      <td className="ledger-table-amount" style={{ ...tdStyle, color: expense.is_income ? '#22543d' : '#2d3748' }}>
        £{Number(expense.amount).toFixed(2)}
      </td>
      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: rowPadding }}>
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', fontSize: '0.85rem' }}>
          <button type="button" onClick={onStartEdit} className="inlineButton table-icon-btn" title="Edit Transaction">✏️</button>
          <button type="button" onClick={() => onDelete && onDelete(expense.id)} className="inlineButton table-icon-btn table-icon-btn--delete" style={{ background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }} title="Delete Transaction">🗑️</button>
        </div>
      </td>
    </tr>
  );
}
